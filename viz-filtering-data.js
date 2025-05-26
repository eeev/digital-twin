looker.plugins.visualizations.add({
    id: "machine_3d_model_filtering",
    label: "3D Machine Model: Filtering",

    options: {},

    // Speichere hier Referenzen zu Three.js Objekten, dem geladenen Font und dem 3D Text Mesh
    _scene: null,
    _camera: null,
    _renderer: null,
    _controls: null,
    _model: null, // Das geladene GLTF Modell
    _modelLoaded: false, // Flag um zu prüfen, ob das Modell geladen ist
    _font: null, // Das geladene Three.js Font Objekt
    _statusTextMesh: null, // Referenz auf das 3D Text Mesh
    _labels: {}, // Store all labels here

    create: function (element, config) {
        // Add a loading indicator
        element.innerHTML = "Loading libraries... (this may take a minute)";

        // Load Three.js (Code bleibt gleich)
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/three@0.133.0/build/three.min.js'; // <--- R133 CORE

        script.onload = () => {
            // Clear loading message
            element.innerHTML = '';
            element.innerHTML = "Loading helpers...";

            // Load GLTFLoader, OrbitControls, EXRLoader (Code bleibt gleich)
            const gltfScript = document.createElement('script');
            gltfScript.src = 'https://unpkg.com/three@0.133.0/examples/js/loaders/GLTFLoader.js'; // <--- R133 EXAMPLES/JS

            gltfScript.onload = () => {
                const orbitScript = document.createElement('script');
                orbitScript.src = 'https://unpkg.com/three@0.133.0/examples/js/controls/OrbitControls.js'; // <--- R133 EXAMPLES/JS

                orbitScript.onload = () => {
                    const exrScript = document.createElement('script');
                    exrScript.src = 'https://unpkg.com/three@0.133.0/examples/js/loaders/EXRLoader.js'; // <--- R133 EXAMPLES/JS

                    exrScript.onload = () => {
                        // Load TextGeometry
                        const textGeometryScript = document.createElement('script');
                        textGeometryScript.src = 'https://unpkg.com/three@0.133.0/examples/js/geometries/TextGeometry.js';

                        textGeometryScript.onload = () => {
                            // Load FontLoader
                            const fontScript = document.createElement('script');
                            fontScript.src = 'https://unpkg.com/three@0.133.0/examples/js/loaders/FontLoader.js';

                            fontScript.onload = () => {
                                // Load Font
                                const fontLoader = new THREE.FontLoader();
                                fontLoader.load(
                                    'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json',
                                    (font) => {
                                        console.log("Font loaded successfully");
                                        this._font = font;

                                        // Setup scene
                                        element.innerHTML = '';
                                        element.style.margin = '-8px';
                                        element.style.width = 'calc(100% + 8px)';
                                        element.style.height = 'calc(100% + 47px)';
                                        element.style.backgroundColor = '#ffffff';
                                        element.style.position = 'relative';

                                        this._scene = new THREE.Scene();
                                        this._scene.background = new THREE.Color(0xffffff);

                                        // Add axes helper
                                        const axesHelper = new THREE.AxesHelper(5);
                                        this._scene.add(axesHelper);

                                        // Load environment map
                                        const exrLoader = new THREE.EXRLoader();
                                        exrLoader.load(
                                            'envMap.exr',
                                            (texture) => {
                                                texture.mapping = THREE.EquirectangularReflectionMapping;
                                                texture.encoding = THREE.LinearEncoding;
                                                this._scene.background = new THREE.Color(0xffffff);
                                                this._scene.environment = texture;
                                            },
                                            function (xhr) { console.log((xhr.loaded / xhr.total * 100) + '% loaded (EnvMap)'); },
                                            function (error) { console.error('Error loading environment map:', error); }
                                        );

                                        const light = new THREE.DirectionalLight(0xffffff, 0.5);
                                        light.position.set(1, 1, 1);
                                        this._scene.add(light);
                                        this._scene.add(new THREE.AmbientLight(0x404040));

                                        this._camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
                                        this._camera.position.set(2, 2, 2);
                                        this._camera.lookAt(0, 0, 0);

                                        this._renderer = new THREE.WebGLRenderer({
                                            antialias: true, alpha: true, preserveDrawingBuffer: true
                                        });
                                        this._renderer.setSize(element.clientWidth, element.clientHeight);
                                        this._renderer.setClearColor(0xffffff, 1);
                                        this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
                                        this._renderer.toneMappingExposure = 1.7;
                                        this._renderer.outputEncoding = THREE.sRGBEncoding;
                                        this._renderer.domElement.style.position = 'absolute';
                                        this._renderer.domElement.style.top = '0';
                                        this._renderer.domElement.style.left = '0';
                                        this._renderer.domElement.style.width = '100%';
                                        this._renderer.domElement.style.height = '100%';
                                        element.appendChild(this._renderer.domElement);

                                        this._controls = new THREE.OrbitControls(this._camera, this._renderer.domElement);
                                        this._controls.enableDamping = true;
                                        this._controls.dampingFactor = 0.05;
                                        this._controls.minDistance = 0.5;
                                        this._controls.maxDistance = 4;
                                        this._controls.target.set(0, 0, 0);

                                        // Load model
                                        const loader = new THREE.GLTFLoader();
                                        loader.load(
                                            'station-b-filtering-real.glb',
                                            (gltf) => {
                                                this._model = gltf.scene;
                                                this._scene.add(this._model);
                                                //this._model.rotation.x = Math.PI / 2;

                                                /**
                                                this._model.traverse((child) => {
                                                    if (child.isMesh && child.material) {
                                                        const materials = Array.isArray(child.material) ? child.material : [child.material];
                                                        materials.forEach(mat => {
                                                            if (mat.envMap !== undefined) mat.envMap = this._scene.environment;
                                                            mat.envMapIntensity = 1.0;
                                                            mat.metalness = 0.2;
                                                            mat.roughness = 0.7;
                                                            mat.needsUpdate = true;
                                                        });
                                                    }
                                                });
                                                 */

                                                const box = new THREE.Box3().setFromObject(this._model);
                                                const center = box.getCenter(new THREE.Vector3());
                                                const size = box.getSize(new THREE.Vector3());
                                                const maxDim = Math.max(size.x, size.y, size.z);
                                                const scale = 2 / maxDim;
                                                this._model.scale.setScalar(scale);
                                                this._model.position.set(0, 0, 0);
                                                const scaledCenter = center.clone().multiplyScalar(scale);
                                                this._model.position.sub(scaledCenter);

                                                console.log('Model loaded successfully');
                                                this._controls.target.set(0, 0, 0);
                                                this._controls.update();
                                                this._modelLoaded = true;

                                                // Add test label
                                                this.addTestLabel();
                                            },
                                            function (xhr) { const progress = (xhr.loaded / xhr.total * 100); console.log(progress + '% loaded (Model)'); },
                                            function (error) { console.error('Error loading model:', error); }
                                        );

                                        const animate = () => {
                                            requestAnimationFrame(animate);
                                            this._controls.update();
                                            if (this._renderer && this._scene && this._camera) {
                                                this._renderer.render(this._scene, this._camera);
                                            }
                                        };
                                        const resizeObserver = new ResizeObserver(entries => {
                                            for (let entry of entries) {
                                                const width = entry.contentRect.width;
                                                const height = entry.contentRect.height;
                                                if (this._camera && this._renderer) {
                                                    this._camera.aspect = width / height;
                                                    this._camera.updateProjectionMatrix();
                                                    this._renderer.setSize(width, height);
                                                }
                                            }
                                        });
                                        resizeObserver.observe(element);
                                        animate();

                                    },
                                    undefined,
                                    function (error) { console.error('Error loading font:', error); }
                                );
                            };
                            fontScript.onerror = (e) => { console.error("Failed to load FontLoader", e); };
                            document.head.appendChild(fontScript);
                        };
                        textGeometryScript.onerror = (e) => { console.error("Failed to load TextGeometry", e); };
                        document.head.appendChild(textGeometryScript);
                    };
                    exrScript.onerror = (e) => { console.error("Failed to load EXRLoader", e); };
                    document.head.appendChild(exrScript);
                };
                orbitScript.onerror = (e) => { console.error("Failed to load OrbitControls", e); };
                document.head.appendChild(orbitScript);
            };
            gltfScript.onerror = (e) => { console.error("Failed to load GLTFLoader", e); };
            document.head.appendChild(gltfScript);
        };
        script.onerror = (e) => { console.error("Failed to load Three.js", e); };
        document.head.appendChild(script);
    },

    // Helper function to create a label
    createLabel: function (id, text, position, size = 0.1, height = 0.02) {
        if (!this._font) return null;

        // Remove existing label if it exists
        if (this._labels[id]) {
            this._scene.remove(this._labels[id]);
            if (this._labels[id].geometry) this._labels[id].geometry.dispose();
            if (this._labels[id].material) {
                if (Array.isArray(this._labels[id].material)) {
                    this._labels[id].material.forEach(mat => mat.dispose());
                } else {
                    this._labels[id].material.dispose();
                }
            }
        }

        // Create text geometry
        const textGeometry = new THREE.TextGeometry(text, {
            font: this._font,
            size: size,
            height: height,
            curveSegments: 12
        });

        // Center the text
        textGeometry.computeBoundingBox();
        const textCenterX = -0.5 * (textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x);
        const textCenterY = 0;
        const textCenterZ = -0.5 * (textGeometry.boundingBox.max.z - textGeometry.boundingBox.min.z);
        textGeometry.translate(textCenterX, textCenterZ, textCenterY);

        // Create material and mesh
        const textMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);

        // Set position and rotation
        textMesh.position.copy(position);
        textMesh.rotation.y = Math.PI / 2; // Rotate 90 degrees around Y axis

        // Store the label
        this._labels[id] = textMesh;
        this._scene.add(textMesh);

        return textMesh;
    },

    // Helper function to update label text and color
    updateLabel: function (id, text, color = 0x000000, height = 0.02, size = 0.05) {
        if (!this._labels[id]) return;

        // Remove old mesh
        this._scene.remove(this._labels[id]);
        if (this._labels[id].geometry) this._labels[id].geometry.dispose();
        if (this._labels[id].material) {
            if (Array.isArray(this._labels[id].material)) {
                this._labels[id].material.forEach(mat => mat.dispose());
            } else {
                this._labels[id].material.dispose();
            }
        }

        // Create new geometry with updated text
        const textGeometry = new THREE.TextGeometry(text, {
            font: this._font,
            size: size,
            height: height,
            curveSegments: 12
        });

        // Center the text
        textGeometry.computeBoundingBox();
        const textCenterX = -0.5 * (textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x);
        const textCenterY = 0;
        const textCenterZ = -0.5 * (textGeometry.boundingBox.max.z - textGeometry.boundingBox.min.z);
        textGeometry.translate(textCenterX, textCenterZ, textCenterY);

        // Create new material with emission
        const textMaterial = new THREE.MeshPhongMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.5,
            shininess: 0
        });
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);

        // Copy position and rotation from old mesh
        textMesh.position.copy(this._labels[id].position);
        textMesh.rotation.copy(this._labels[id].rotation);

        // Update stored label
        this._labels[id] = textMesh;
        this._scene.add(textMesh);
    },

    addTestLabel: function () {
        // Prozess
        this.createLabel('status', 'Process Ready: No', new THREE.Vector3(0, 1.0, 0), 0.1, 0.02);
        // Durchfluss
        this.createLabel('flow rate', 'Flow Rate: 256 l/hr', new THREE.Vector3(0.6, 0.05, 0.2), 0.06, 0.01);
        // Motoren
        this.createLabel('mb7', 'MB7: Off', new THREE.Vector3(-0.2, 0.10, 0.2), 0.06, 0.01);
        // Füllstandssensoren
        this.createLabel('bg2', 'BG2', new THREE.Vector3(-0.15, -0.20, 0.55), 0.06, 0.01);
        this.createLabel('bg3', 'BG3', new THREE.Vector3(-0.15, -0.7, 0.55), 0.06, 0.01);
        this.createLabel('bg4', 'BG4', new THREE.Vector3(-0.15, -0.20, -0.75), 0.06, 0.01);
        this.createLabel('bg5', 'BG5', new THREE.Vector3(-0.15, -0.7, -0.75), 0.06, 0.01);
        // Motorpumpen
        this.createLabel('ma2', 'MA2: Off', new THREE.Vector3(0.4, -0.75, 0.2), 0.06, 0.01);
        this.createLabel('ma3', 'MA3: Off', new THREE.Vector3(0.4, -0.75, -0.3), 0.06, 0.01);
        // Valves
        this.createLabel('mb6', 'MB6: Closed', new THREE.Vector3(0.4, -0.4, -0.4), 0.06, 0.01);
        this.createLabel('mb5', 'MB5: Off', new THREE.Vector3(0.55, 0.50, 0.45), 0.06, 0.01);
        this.createLabel('mb4', 'MB4: Off', new THREE.Vector3(0.55, 0.50, -0.05), 0.06, 0.01);

        // Example of how to update labels later:
        /*
        // Update text and color with emission
        this.updateLabel('status', 'Process Ready: Yes', 0x00ff00, 0.02); // Green with emission
        this.updateLabel('mb7', 'MB7: On', 0x00ff00, 0.01); // Green with emission
        this.updateLabel('ma2', 'MA2: On', 0x00ff00, 0.01); // Green with emission
        this.updateLabel('mb6', 'MB6: Open', 0xff0000, 0.01); // Red with emission
        */
        //this.updateLabel('mb6', 'MB6: Closed', 0xff0000, 0.01, 0.06); // Red with emission, maintaining size
    },

    // DIESE Funktion wird von Looker mit den Daten aufgerufen!
    updateAsync: function (data, element, config, queryResponse, details) {
        // Stelle sicher, dass das Modell UND der Font geladen sind, bevor wir 3D Text erstellen
        // Jetzt basierend auf r133 mit FontLoader
        if (!this._model || !this._modelLoaded || !this._font) {
            console.log("Model or Font not yet loaded, skipping data update logic.");
            return Promise.resolve();
        }

        console.log("updateAsync wurde aufgerufen!");
        console.log("Looker Daten (Parameter 'data'):", data);
        console.log("Looker Abfrage-Metadaten (Parameter 'queryResponse'):", queryResponse);

        // Finde die relevanten Felder (Code bleibt fürs Debugging)
        const dimensions = queryResponse.fields.dimension_like;
        const measures = queryResponse.fields.measure_like;
        console.log("Ausgewählte Dimensionen:", dimensions);
        console.log("Ausgewählte Measures:", measures);


        // --- LOGIK: 3D LABEL BASIEREND AUF DEM ERSTEN DATENPUNKT (verwendet geladenen Font) ---

        let processReadyValue = "N/A"; // Standardwert, falls Daten fehlen

        // Prüfen, ob Daten vorhanden sind und die erwartete Struktur haben
        if (data && data.length > 0 && data[0]["digital_twin_filtration.payload_boolean"]) {
            // Greife auf den Wert des ersten Elements im Array für das spezifische Feld zu
            processReadyValue = data[0]["digital_twin_filtration.payload_boolean"].value;
        } else {
            console.warn("Daten für 'digital_twin_filtration.payload_boolean' im ersten Row nicht gefunden oder Daten sind leer.");
        }

        // Text für das Label erstellen
        const labelText = `Process Ready: ${processReadyValue}`;

        // Entferne das alte Text Mesh, falls es existiert
        if (this._statusTextMesh) {
            this._scene.remove(this._statusTextMesh);
            // Optional: Geometrie und Material freigeben, um Speicher zu sparen
            if (this._statusTextMesh.geometry) this._statusTextMesh.geometry.dispose();
            if (this._statusTextMesh.material) {
                if (Array.isArray(this._statusTextMesh.material)) {
                    this._statusTextMesh.material.forEach(mat => mat.dispose());
                } else {
                    this._statusTextMesh.material.dispose();
                }
            }
            this._statusTextMesh = null;
        }

        // Erstelle neue 3D Text Geometrie
        const textGeometry = new THREE.TextGeometry(labelText, {
            font: this._font, // Geladene Schriftart verwenden
            size: 0.2, // Größe des Textes (an Modellgröße anpassen)
            height: 0.02, // Dicke des Textes (Extrusion)
            curveSegments: 12, // Detailgrad der Kurven
            // bevelEnabled: true, // Optional: Kanten abschrägen
            // bevelThickness: 0.01,
            // bevelSize: 0.01,
            // bevelSegments: 5
        });

        // Zentriere die Textgeometrie
        textGeometry.computeBoundingBox();
        const textCenterX = - 0.5 * (textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x);
        // Passe Zentrierung für r133 an, falls nötig. In r128 war Y oft vertikal im Font.
        // Teste ob textGeometry.boundingBox.min/max.y das Minimum/Maximum der Höhe repräsentiert.
        // const textCenterY = - 0.5 * (textGeometry.boundingBox.max.y - textGeometry.boundingBox.min.y); // Vertikale Zentrierung
        const textCenterY = 0; // Oft ist die Grundlinie bei Y=0

        const textCenterZ = - 0.5 * (textGeometry.boundingBox.max.z - textGeometry.boundingBox.min.z); // Tiefe zentrieren


        // Passe die translate-Achsen an die Ausrichtung deiner FontGeometry an (könnte je nach Font anders sein)
        // Wenn TextGeometry in der XY-Ebene liegt und Z die Extrusion ist:
        // textGeometry.translate(textCenterX, textCenterY, 0);
        // Wenn TextGeometry in der XZ-Ebene liegt und Y die Extrusion ist (wie oft bei gedrehten Modellen):
        textGeometry.translate(textCenterX, textCenterZ, textCenterY); // X, Extrusion (Z), Vertikale (Y)


        // Erstelle ein Material für den Text (schwarz wie gewünscht)
        const textMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

        // Erstelle das 3D Mesh
        this._statusTextMesh = new THREE.Mesh(textGeometry, textMaterial);

        // Positioniere das Text Mesh im 3D Raum über dem Modell (Z ist vertikal in Szene)
        const textHeightAboveModel = 1.0; // Vertikale Position über dem Modellursprung
        const textPosition = new THREE.Vector3(0, 0, textHeightAboveModel); // Position über dem Ursprung (0,0,0) in der Szene

        this._scene.add(this._statusTextMesh);
        this._statusTextMesh.position.copy(textPosition);


        // --- ENDE 3D LABEL LOGIK (verwendet FontLoader r133) ---


        // Rendere die Szene neu
        if (this._renderer && this._scene && this._camera) {
            this._renderer.render(this._scene, this._camera);
        }

        // Example of how to update labels based on data:
        /*
        if (data && data.length > 0) {
            const processReady = data[0]["digital_twin_filtration.payload_boolean"].value;
            const pressure = data[0]["pressure"].value;
            const temperature = data[0]["temperature"].value;

            // Update labels with new values
            this.updateLabel('status', `Process Ready: ${processReady}`, processReady ? 0x00ff00 : 0xff0000);
            this.updateLabel('pressure', `Pressure: ${pressure} bar`, 0x000000);
            this.updateLabel('temperature', `Temp: ${temperature}°C`, 0x000000);
        }
        */

        return Promise.resolve();
    }
});