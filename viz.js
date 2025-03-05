looker.plugins.visualizations.add({
    id: "machine_3d_model",
    label: "3D Machine Model",

    options: {},

    create: function (element, config) {
        // Load Three.js
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

        script.onload = () => {
            // Create container - FIXED: removed the id and just use the element directly
            element.style.width = '100%';
            element.style.height = '400px';

            // Setup scene
            const scene = new THREE.Scene();
            scene.background = new THREE.Color(0xf0f0f0);  // Light gray background

            // Setup camera
            const camera = new THREE.PerspectiveCamera(75, element.clientWidth / element.clientHeight, 0.1, 1000);
            camera.position.z = 5;

            // Setup renderer
            const renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(element.clientWidth, element.clientHeight);
            element.appendChild(renderer.domElement);

            // Add a cube
            const geometry = new THREE.BoxGeometry();
            const material = new THREE.MeshPhongMaterial({
                color: 0x00ff00,
                shininess: 60
            });
            const cube = new THREE.Mesh(geometry, material);
            scene.add(cube);

            // Add lights
            const light = new THREE.DirectionalLight(0xffffff, 1);
            light.position.set(1, 1, 1);
            scene.add(light);
            scene.add(new THREE.AmbientLight(0x404040));

            // Animation loop
            function animate() {
                requestAnimationFrame(animate);
                cube.rotation.x += 0.01;
                cube.rotation.y += 0.01;
                renderer.render(scene, camera);
            }

            // Handle window resize
            window.addEventListener('resize', () => {
                camera.aspect = element.clientWidth / element.clientHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(element.clientWidth, element.clientHeight);
            });

            // Start animation
            animate();
        };

        document.head.appendChild(script);
    },

    updateAsync: function (data, element, config, queryResponse, details) {
        return;
    }
});