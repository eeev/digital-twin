looker.plugins.visualizations.add({
    id: "machine_3d_model_reactor",
    label: "3D Machine Model: Reactor",

    options: {},

    create: function (element, config) {
        // Add a loading indicator
        element.innerHTML = "Loading library... (this may take a minute)";

        // Load Three.js
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/three@0.128.0/build/three.min.js';

        script.onload = () => {
            // Clear loading message
            element.innerHTML = '';

            element.innerHTML = "Loading model helper...";

            // Load GLTFLoader, OrbitControls, and EXRLoader
            const gltfScript = document.createElement('script');
            gltfScript.src = 'https://unpkg.com/three@0.128.0/examples/js/loaders/GLTFLoader.js';

            gltfScript.onload = () => {
                // Load OrbitControls
                const orbitScript = document.createElement('script');
                orbitScript.src = 'https://unpkg.com/three@0.128.0/examples/js/controls/OrbitControls.js';

                orbitScript.onload = () => {
                    // Load EXRLoader
                    const exrScript = document.createElement('script');
                    exrScript.src = 'https://unpkg.com/three@0.128.0/examples/js/loaders/EXRLoader.js';

                    exrScript.onload = () => {
                        // Clear any existing content and set up container
                        element.innerHTML = '';
                        element.style.margin = '-8px';
                        element.style.width = 'calc(100% + 8px)';
                        element.style.height = 'calc(100% + 47px)';
                        //element.style.height = '600px';
                        element.style.backgroundColor = '#ffffff';  // Slightly darker gray
                        element.style.position = 'relative';

                        // Setup scene
                        const scene = new THREE.Scene();
                        scene.background = new THREE.Color(0xffffff);  // Matching darker gray

                        // Load environment map
                        const exrLoader = new THREE.EXRLoader();
                        exrLoader.load(
                            'https://eeev.github.io/digital-twin/envMap.exr',
                            function (texture) {
                                texture.mapping = THREE.EquirectangularReflectionMapping;
                                texture.encoding = THREE.LinearEncoding;

                                // Set a solid color background
                                scene.background = new THREE.Color(0xffffff);  // Matching darker gray

                                // Keep the environment map for reflections and lighting
                                scene.environment = texture;
                            },
                            function (xhr) {
                                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
                            },
                            function (error) {
                                console.error('Error loading environment map:', error);
                            }
                        );

                        // Add grid helper
                        //const gridHelper = new THREE.GridHelper(10, 10);
                        //scene.add(gridHelper);

                        // Add axes helper
                        //const axesHelper = new THREE.AxesHelper(5);
                        //scene.add(axesHelper);

                        // Needed for testing purposes of reflections
                        const material = new THREE.MeshStandardMaterial({
                            color: 0xff0000,
                            metalness: 0.7,
                            roughness: 0.2
                        });

                        // Setup camera with adjusted position
                        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
                        camera.position.set(2, 2, 2);
                        camera.lookAt(0, 0, 0);

                        // Setup renderer
                        const renderer = new THREE.WebGLRenderer({
                            antialias: true,
                            alpha: true,
                            preserveDrawingBuffer: true
                        });

                        // Configure renderer
                        renderer.setSize(element.clientWidth, element.clientHeight);
                        renderer.setClearColor(0xffffff, 1);  // Matching darker gray
                        renderer.toneMapping = THREE.ACESFilmicToneMapping;
                        renderer.toneMappingExposure = 1.7;
                        renderer.outputEncoding = THREE.sRGBEncoding;
                        renderer.domElement.style.position = 'absolute';
                        renderer.domElement.style.top = '0';
                        renderer.domElement.style.left = '0';
                        renderer.domElement.style.width = '100%';
                        renderer.domElement.style.height = '100%';

                        // Add renderer to container
                        element.appendChild(renderer.domElement);

                        // Add OrbitControls
                        const controls = new THREE.OrbitControls(camera, renderer.domElement);
                        controls.enableDamping = true;
                        controls.dampingFactor = 0.05;
                        controls.minDistance = 1;
                        controls.maxDistance = 20;
                        controls.target.set(0, 0, 0);

                        // Add lights

                        const light = new THREE.DirectionalLight(0xffffff, 0.5);
                        light.position.set(1, 1, 1);
                        scene.add(light);

                        scene.add(new THREE.AmbientLight(0x404040));


                        let model = null;

                        // Load your model
                        const loader = new THREE.GLTFLoader();
                        loader.load(
                            'https://eeev.github.io/digital-twin/station-b-reactor.glb',
                            function (gltf) {
                                model = gltf.scene;
                                scene.add(model);

                                // Rotate 90 degrees on X-axis (in radians)
                                model.rotation.x = Math.PI / 2;

                                // Apply environment map to all materials in the model
                                model.traverse((child) => {
                                    if (child.isMesh) {
                                        if (child.material) {
                                            child.material.envMap = scene.environment;
                                            child.material.envMapIntensity = 1.0;
                                            child.material.metalness = 0.2;  // Increased metallic look
                                            child.material.roughness = 0.7;  // Reduced roughness for more shine
                                            child.material.needsUpdate = true;
                                        }
                                    }
                                });

                                const box = new THREE.Box3().setFromObject(model);
                                const center = box.getCenter(new THREE.Vector3());
                                const size = box.getSize(new THREE.Vector3());

                                console.log('Model dimensions:', size);
                                console.log('Model center:', center);

                                const maxDim = Math.max(size.x, size.y, size.z);
                                const scale = 2 / maxDim;
                                model.scale.setScalar(scale);

                                model.position.set(0, 0, 0);
                                model.position.sub(center.multiplyScalar(scale));

                                console.log('Model loaded successfully');
                                controls.target.copy(model.position);
                                controls.update();
                            },
                            function (xhr) {
                                const progress = (xhr.loaded / xhr.total * 100);
                                console.log(progress + '% loaded');
                            },
                            function (error) {
                                console.error('Error loading model:', error);
                            }
                        );

                        // Animation loop
                        function animate() {
                            requestAnimationFrame(animate);
                            /*
                            if (model) {
                                model.rotation.y += 0.01;
                            }
                            */
                            controls.update();
                            renderer.render(scene, camera);
                        }

                        // Handle window resize
                        const resizeObserver = new ResizeObserver(entries => {
                            for (let entry of entries) {
                                const width = entry.contentRect.width;
                                const height = entry.contentRect.height;
                                camera.aspect = width / height;
                                camera.updateProjectionMatrix();
                                renderer.setSize(width, height);
                            }
                        });

                        resizeObserver.observe(element);

                        // Start animation
                        animate();
                    };

                    exrScript.onerror = (e) => {
                        console.error("Failed to load EXRLoader", e);
                    };

                    document.head.appendChild(exrScript);
                };

                orbitScript.onerror = (e) => {
                    console.error("Failed to load OrbitControls", e);
                };

                document.head.appendChild(orbitScript);
            };

            gltfScript.onerror = (e) => {
                console.error("Failed to load GLTFLoader", e);
            };

            document.head.appendChild(gltfScript);
        };

        script.onerror = (e) => {
            console.error("Failed to load Three.js", e);
        };

        document.head.appendChild(script);
    },

    updateAsync: function (data, element, config, queryResponse, details) {
        return;
    }
});