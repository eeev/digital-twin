looker.plugins.visualizations.add({
    id: "machine_3d_model_filtering",
    label: "3D Machine Model: Filtering",

    options: {},

    // Speichere hier Referenzen zu Three.js Objekten, damit updateAsync sie nutzen kann
    _scene: null,
    _camera: null,
    _renderer: null,
    _controls: null,
    _model: null, // Das geladene GLTF Modell
    _modelLoaded: false, // Flag um zu prüfen, ob das Modell geladen ist

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
                        element.style.backgroundColor = '#ffffff';
                        element.style.position = 'relative';

                        // Setup scene - HIER Speichern auf this
                        this._scene = new THREE.Scene();
                        this._scene.background = new THREE.Color(0xffffff);

                        // Load environment map
                        const exrLoader = new THREE.EXRLoader();
                        exrLoader.load(
                            'https://eeev.github.io/digital-twin/envMap.exr',
                            (texture) => {
                                texture.mapping = THREE.EquirectangularReflectionMapping;
                                texture.encoding = THREE.LinearEncoding;
                                this._scene.background = new THREE.Color(0xffffff);
                                this._scene.environment = texture;
                            },
                            function (xhr) { console.log((xhr.loaded / xhr.total * 100) + '% loaded (EnvMap)'); },
                            function (error) { console.error('Error loading environment map:', error); }
                        );

                        // Add lights
                        const light = new THREE.DirectionalLight(0xffffff, 0.5);
                        light.position.set(1, 1, 1);
                        this._scene.add(light);
                        this._scene.add(new THREE.AmbientLight(0x404040));

                        // Setup camera - HIER Speichern auf this
                        this._camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
                        this._camera.position.set(2, 2, 2);
                        this._camera.lookAt(0, 0, 0);

                        // Setup renderer - HIER Speichern auf this
                        this._renderer = new THREE.WebGLRenderer({
                            antialias: true,
                            alpha: true,
                            preserveDrawingBuffer: true
                        });

                        // Configure renderer
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

                        // Add renderer to container
                        element.appendChild(this._renderer.domElement);

                        // Add OrbitControls - HIER Speichern auf this
                        this._controls = new THREE.OrbitControls(this._camera, this._renderer.domElement);
                        this._controls.enableDamping = true;
                        this._controls.dampingFactor = 0.05;
                        this._controls.minDistance = 1;
                        this._controls.maxDistance = 20;
                        this._controls.target.set(0, 0, 0);

                        // Load your model - HIER Speichern auf this und Flag setzen
                        const loader = new THREE.GLTFLoader();
                        loader.load(
                            'https://eeev.github.io/digital-twin/station-b-filtering.glb',
                            (gltf) => {
                                this._model = gltf.scene;
                                this._scene.add(this._model);

                                // Rotate 90 degrees on X-axis (in radians)
                                this._model.rotation.x = Math.PI / 2;

                                // Apply environment map to all materials in the model
                                this._model.traverse((child) => {
                                    if (child.isMesh) {
                                        if (child.material) {
                                            child.material.envMap = this._scene.environment;
                                            child.material.envMapIntensity = 1.0;
                                            child.material.metalness = 0.2;
                                            child.material.roughness = 0.7;
                                            child.material.needsUpdate = true;
                                        }
                                    }
                                });

                                const box = new THREE.Box3().setFromObject(this._model);
                                const center = box.getCenter(new THREE.Vector3());
                                const size = box.getSize(new THREE.Vector3());

                                console.log('Model dimensions:', size);
                                console.log('Model center:', center);

                                const maxDim = Math.max(size.x, size.y, size.z);
                                const scale = 2 / maxDim;
                                this._model.scale.setScalar(scale);

                                this._model.position.set(0, 0, 0);
                                this._model.position.sub(center.multiplyScalar(scale));

                                console.log('Model loaded successfully');
                                this._controls.target.copy(this._model.position);
                                this._controls.update();

                                this._modelLoaded = true; // Modell ist geladen
                                // Nachdem das Modell geladen ist, ist es möglich, dass updateAsync bereits aufgerufen wurde
                                // mit den initialen Daten. Wenn du sicherstellen willst, dass die Datenlogik
                                // immer nach dem Laden des Modells läuft, müsstest du hier updateAsync manuell triggern
                                // oder die Daten, die beim ersten Aufruf von updateAsync kamen, speichern und hier verarbeiten.
                                // Fürs Debugging reicht es aber, dass updateAsync bei jeder Änderung der Daten aufgerufen wird.
                            },
                            function (xhr) { const progress = (xhr.loaded / xhr.total * 100); console.log(progress + '% loaded (Model)'); },
                            function (error) { console.error('Error loading model:', error); }
                        );

                        // Animation loop - nutzt die gespeicherten Objekte
                        const animate = () => {
                            requestAnimationFrame(animate);
                            this._controls.update();
                            if (this._renderer && this._scene && this._camera) {
                                this._renderer.render(this._scene, this._camera);
                            }
                        };

                        // Handle window resize - nutzt die gespeicherten Objekte
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

                        // Start animation
                        animate();
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

    // DIESE Funktion wird von Looker mit den Daten aufgerufen!
    // Die Daten sind im Parameter 'data' enthalten.
    // Metadaten zur Abfrage sind in 'queryResponse'.
    updateAsync: function (data, element, config, queryResponse, details) {
        // Stelle sicher, dass das Modell geladen ist, bevor du versuchst, es zu aktualisieren (auch wenn wir hier nur printen)
        if (!this._model || !this._modelLoaded) {
            console.log("Model not yet loaded, skipping update.");
            // Speichere die Daten eventuell hier, um sie nach dem Laden des Modells zu verarbeiten,
            // oder ignoriere das Update, bis das nächste kommt (z.B. durch Filteränderung).
            // Fürs reine Debugging ist das Skips hier OK.
             return Promise.resolve(); // Wichtig: Immer einen Promise zurückgeben
        }

        console.log("updateAsync wurde aufgerufen!");
        console.log("Looker Daten (Parameter 'data'):", data); // Hier sind die Abfrageergebnisse (Array von Zeilen)
        console.log("Looker Abfrage-Metadaten (Parameter 'queryResponse'):", queryResponse); // Enthält Felder, etc.

        // queryResponse.fields enthält Informationen über die ausgewählten Spalten (Dimensionen und Measures)
        const dimensions = queryResponse.fields.dimension_like;
        const measures = queryResponse.fields.measure_like;

        console.log("Ausgewählte Dimensionen:", dimensions); // Zeigt Details zu den Dimensionen
        console.log("Ausgewählte Measures:", measures);   // Zeigt Details zu den Measures

        // --- HIER WÜRDE SPÄTER DEINE LOGIK ZUM VERARBEITEN DER DATEN STEHEN ---
        // Du würdest über das 'data'-Array iterieren, auf die Werte in jeder 'row' zugreifen
        // (z.B. row[dimensions[0].name].value für den Wert der ersten Dimension),
        // und dann Three.js verwenden (z.B. this._model.getObjectByName(...))
        // um das Modell zu aktualisieren.
        // Zum Beispiel:
        /*
        data.forEach(row => {
             const partIdentifier = row[dimensions[0].name].value; // Annahme: Erste Dimension ist ID
             const statusValue = row[measures[0].name].value;   // Annahme: Erstes Measure ist Status

             console.log(`Row Data: Identifier=${partIdentifier}, Value=${statusValue}`);

             // Finde das entsprechende Objekt im 3D-Modell und aktualisiere es
             // ... deine Three.js update Logik hier ...
        });
        */

        // --- ENDE DER DATENVERARBEITUNGS-ZONE ---


        // Wichtig: Nach der Datenverarbeitung muss die Szene neu gerendert werden,
        // damit die Änderungen sichtbar werden.
        // Da wir hier gerade nichts ändern, ist das Rendern technisch nicht zwingend,
        // aber es ist guter Stil, es nach der Datenverarbeitung aufzurufen.
        if (this._renderer && this._scene && this._camera) {
             this._renderer.render(this._scene, this._camera);
        }


        // Looker erwartet, dass updateAsync einen Promise zurückgibt
        return Promise.resolve();
    }
});