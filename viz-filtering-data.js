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

    create: function (element, config) {
        // Add a loading indicator
        element.innerHTML = "Loading libraries... (this may take a minute)";

        // Load Three.js (Code bleibt gleich)
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/three@0.128.0/build/three.min.js';

        script.onload = () => {
             // Clear loading message
            element.innerHTML = '';
            element.innerHTML = "Loading helpers...";

            // Load GLTFLoader, OrbitControls, EXRLoader (Code bleibt gleich)
            const gltfScript = document.createElement('script');
            gltfScript.src = 'https://unpkg.com/three@0.128.0/examples/js/loaders/GLTFLoader.js';

            gltfScript.onload = () => {
                const orbitScript = document.createElement('script');
                orbitScript.src = 'https://unpkg.com/three@0.128.0/examples/js/controls/OrbitControls.js';

                orbitScript.onload = () => {
                    const exrScript = document.createElement('script');
                    exrScript.src = 'https://unpkg.com/three@0.128.0/examples/js/loaders/EXRLoader.js';

                    exrScript.onload = () => {
                         // --- NEU: FontLoader laden ---
                        const fontScript = document.createElement('script');
                        fontScript.src = 'https://unpkg.com/three@0.128.0/examples/js/loaders/FontLoader.js';

                        fontScript.onload = () => {
                             // --- NEU: Schriftart laden ---
                            const fontLoader = new THREE.FontLoader();
                            // Lädt eine Standard-Schriftart aus den Three.js Beispielen
                            // Stelle sicher, dass diese URL von Looker aus erreichbar ist
                            fontLoader.load(
                                'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json',
                                (font) => {
                                    console.log("Font loaded successfully");
                                    this._font = font; // Schriftart auf 'this' speichern

                                    // --- Rest des Three.js Setups beginnt hier, NACHDEM ALLE HELFER UND FONT GELADEN SIND ---

                                    // Clear any existing content and set up container
                                    element.innerHTML = '';
                                    element.style.margin = '-8px';
                                    element.style.width = 'calc(100% + 8px)';
                                    element.style.height = 'calc(100% + 47px)';
                                    element.style.backgroundColor = '#ffffff';
                                    element.style.position = 'relative'; // Beibehalten für Looker-Layout, aber nicht für 3D-Label Positionierung

                                    // Setup scene - Speichern auf this
                                    this._scene = new THREE.Scene();
                                    this._scene.background = new THREE.Color(0xffffff);

                                    // Load environment map (Code bleibt gleich)
                                    const exrLoader = new THREE.EXRLoader(); // Erneut instanziieren, da im Scope der letzten onload
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

                                    // Add lights (Code bleibt gleich)
                                    const light = new THREE.DirectionalLight(0xffffff, 0.5);
                                    light.position.set(1, 1, 1);
                                    this._scene.add(light);
                                    this._scene.add(new THREE.AmbientLight(0x404040));

                                    // Setup camera - Speichern auf this
                                    this._camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
                                    this._camera.position.set(2, 2, 2);
                                    this._camera.lookAt(0, 0, 0);

                                    // Setup renderer - Speichern auf this
                                    this._renderer = new THREE.WebGLRenderer({
                                        antialias: true,
                                        alpha: true,
                                        preserveDrawingBuffer: true
                                    });

                                    // Configure renderer (Code bleibt gleich)
                                    this._renderer.setSize(element.clientWidth, element.clientHeight);
                                    this._renderer.setClearColor(0xffffff, 1);
                                    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
                                    this._renderer.toneMappingExposure = 1.7;
                                    this._renderer.outputEncoding = THREE.sRGBEncoding;
                                    this._renderer.domElement.style.position = 'absolute'; // Muss absolute bleiben
                                    this._renderer.domElement.style.top = '0';
                                    this._renderer.domElement.style.left = '0';
                                    this._renderer.domElement.style.width = '100%';
                                    this._renderer.domElement.style.height = '100%';

                                    // Add renderer to container (Code bleibt gleich)
                                    element.appendChild(this._renderer.domElement);

                                    // Add OrbitControls - Speichern auf this
                                    this._controls = new THREE.OrbitControls(this._camera, this._renderer.domElement);
                                    this._controls.enableDamping = true;
                                    this._controls.dampingFactor = 0.05;
                                    this._controls.minDistance = 1;
                                    this._controls.maxDistance = 20;
                                    this._controls.target.set(0, 0, 0);

                                    // Load your model - Speichern auf this und Flag setzen
                                    const loader = new THREE.GLTFLoader(); // Erneut instanziieren
                                    loader.load(
                                        'https://eeev.github.io/digital-twin/station-b-filtering.glb',
                                        (gltf) => {
                                            this._model = gltf.scene;
                                            this._scene.add(this._model);

                                            // Rotate 90 degrees on X-axis (in radians)
                                            this._model.rotation.x = Math.PI / 2;

                                            // Apply environment map (Code bleibt gleich)
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


                                            // Model positioning and scaling (Code bleibt gleich)
                                            const box = new THREE.Box3().setFromObject(this._model);
                                            const center = box.getCenter(new THREE.Vector3());
                                            const size = box.getSize(new THREE.Vector3());
                                            const maxDim = Math.max(size.x, size.y, size.z);
                                            const scale = 2 / maxDim;
                                            this._model.scale.setScalar(scale);
                                            this._model.position.set(0, 0, 0);
                                            // Subtrahiere den skalierten Mittelpunkt, um das Modell am Ursprung zu zentrieren
                                            const scaledCenter = center.clone().multiplyScalar(scale);
                                            this._model.position.sub(scaledCenter);


                                            console.log('Model loaded successfully');
                                            // Controls Target aktualisieren, um sich auf das zentrierte Modell zu konzentrieren
                                            // target.set(0,0,0) ist nun korrekt, wenn das Modell am Ursprung zentriert ist
                                            this._controls.target.set(0,0,0);
                                            this._controls.update();

                                            this._modelLoaded = true; // Modell ist geladen
                                        },
                                        function (xhr) { const progress = (xhr.loaded / xhr.total * 100); console.log(progress + '% loaded (Model)'); },
                                        function (error) { console.error('Error loading model:', error); }
                                    );

                                    // Animation loop - nutzt die gespeicherten Objekte (Code bleibt gleich)
                                    const animate = () => {
                                        requestAnimationFrame(animate);
                                        this._controls.update();
                                        if (this._renderer && this._scene && this._camera) {
                                            this._renderer.render(this._scene, this._camera);
                                        }
                                    };

                                    // Handle window resize - nutzt die gespeicherten Objekte (Code bleibt gleich)
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

                                    // --- ENDE DES THREE.JS SETUPS NACH LADEN ALLER RESSOURCEN ---

                                }, // Ende der FontLoader.load Erfolgscallback
                                undefined, // Optionaler Progress-Callback für FontLoader
                                function (error) { console.error('Error loading font:', error); } // FontLoader Fehlercallback
                            ); // Ende FontLoader.load
                        }; // Ende FontLoader.js onload

                        fontScript.onerror = (e) => { console.error("Failed to load FontLoader", e); };
                        document.head.appendChild(fontScript);

                    }; // Ende EXRLoader onload
                    exrScript.onerror = (e) => { console.error("Failed to load EXRLoader", e); };
                    document.head.appendChild(exrScript);
                }; // Ende OrbitControls onload
                orbitScript.onerror = (e) => { console.error("Failed to load OrbitControls", e); };
                document.head.appendChild(orbitScript);
            }; // Ende GLTFLoader onload
            gltfScript.onerror = (e) => { console.error("Failed to load GLTFLoader", e); };
            document.head.appendChild(gltfScript);
        }; // Ende Three.js onload
        script.onerror = (e) => { console.error("Failed to load Three.js", e); };
        document.head.appendChild(script);
    }, // Ende create Funktion


    // DIESE Funktion wird von Looker mit den Daten aufgerufen!
    updateAsync: function (data, element, config, queryResponse, details) {
        // Stelle sicher, dass das Modell UND der Font geladen sind, bevor wir 3D Text erstellen
        if (!this._model || !this._modelLoaded || !this._font) {
            console.log("Model or Font not yet loaded, skipping data update logic.");
             return Promise.resolve(); // Wichtig: Immer einen Promise zurückgeben
        }

        console.log("updateAsync wurde aufgerufen!");
        console.log("Looker Daten (Parameter 'data'):", data);
        console.log("Looker Abfrage-Metadaten (Parameter 'queryResponse'):", queryResponse);

        // Finde die relevanten Felder (Code bleibt fürs Debugging)
        const dimensions = queryResponse.fields.dimension_like;
        const measures = queryResponse.fields.measure_like;
        console.log("Ausgewählte Dimensionen:", dimensions);
        console.log("Ausgewählte Measures:", measures);


        // --- LOGIK: 3D LABEL BASIEREND AUF DEM ERSTEN DATENPUNKT ---

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
                // Wenn Material ein Array ist
                if (Array.isArray(this._statusTextMesh.material)) {
                    this._statusTextMesh.material.forEach(mat => mat.dispose());
                } else { // Einzelnes Material
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

        // Zentriere die Textgeometrie, sonst wird sie standardmäßig linksbündig erstellt
        textGeometry.computeBoundingBox();
        const textCenterX = - 0.5 * (textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x);
        textGeometry.translate(textCenterX, 0, 0);


        // Erstelle ein Material für den Text (schwarz wie gewünscht)
        const textMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 }); // MeshBasicMaterial wird nicht von Licht beeinflusst

        // Erstelle das 3D Mesh
        this._statusTextMesh = new THREE.Mesh(textGeometry, textMaterial);

        // Positioniere das Text Mesh im 3D Raum
        // Annahme: Modell ist um den Ursprung (0,0,0) zentriert und Y ist die vertikale Achse
        // Positioniere es ein Stück über der Maschine
        const textHeightAboveModel = 1.5; // Diesen Wert anpassen, damit das Label passend schwebt
        this._statusTextMesh.position.set(0, textHeightAboveModel, 0); // Position über dem Ursprung

        // Füge das Text Mesh zur Szene hinzu
        this._scene.add(this._statusTextMesh);


        // --- ENDE DER 3D LABEL LOGIK ---


        // Rendere die Szene neu
        if (this._renderer && this._scene && this._camera) {
             this._renderer.render(this._scene, this._camera);
        }


        // Looker erwartet, dass updateAsync einen Promise zurückgibt
        return Promise.resolve();
    }
});