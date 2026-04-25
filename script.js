import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

                
        // 注释
        let currentEarthquakes = [];
        let selectedQuakeKey = null;
        
        const container = document.getElementById('globeContainer');
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x010118);
        scene.fog = new THREE.FogExp2(0x010118, 0.0008);
        
        const camera = new THREE.PerspectiveCamera(45, width/height, 0.1, 1000);
        camera.position.set(0, 0, 3.2);
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.shadowMap.enabled = false;
        container.appendChild(renderer.domElement);
        
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.autoRotate = false;
        controls.enableZoom = true;
        controls.enablePan = false;
        controls.rotateSpeed = 0.8;
        controls.zoomSpeed = 0.8;
        
        // 閺勭喓鈹栫划鎺戠摍
        const starGeometry = new THREE.BufferGeometry();
        const starCount = 2000;
        const starPositions = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount; i++) {
            starPositions[i*3] = (Math.random() - 0.5) * 2000;
            starPositions[i*3+1] = (Math.random() - 0.5) * 2000;
            starPositions[i*3+2] = (Math.random() - 0.5) * 300 - 150;
        }
        starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.35, transparent: true, opacity: 0.8 });
        const stars = new THREE.Points(starGeometry, starMaterial);
        scene.add(stars);
        
        const textureLoader = new THREE.TextureLoader();
        const earthMap = textureLoader.load('https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg');
        const earthSpecularMap = textureLoader.load('https://threejs.org/examples/textures/planets/earth_specular_2048.jpg');
        const earthNormalMap = textureLoader.load('https://threejs.org/examples/textures/planets/earth_normal_2048.jpg');
        const cloudMap = textureLoader.load('https://threejs.org/examples/textures/planets/earth_clouds_1024.png');
        
        const earthMat = new THREE.MeshPhongMaterial({ 
            map: earthMap, 
            specularMap: earthSpecularMap, 
            specular: new THREE.Color(0x333333), 
            shininess: 8,
            normalMap: earthNormalMap
        });
        const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 128), earthMat);
        scene.add(earth);
        
        const cloudMat = new THREE.MeshPhongMaterial({ 
            map: cloudMap, 
            transparent: true, 
            opacity: 0.12, 
            blending: THREE.AdditiveBlending 
        });
        const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.008, 128, 128), cloudMat);
        scene.add(clouds);
        
        const ambientLight = new THREE.AmbientLight(0x111122, 0.8);
        scene.add(ambientLight);
        
        const sunLight = new THREE.DirectionalLight(0xffeedd, 1.35);
        sunLight.position.set(5, 3, 5);
        sunLight.target = earth;
        scene.add(sunLight);
        
        const backFillLight = new THREE.PointLight(0x4466aa, 2);
        backFillLight.position.set(-2, -1, -2.5);
        scene.add(backFillLight);
        
        const rimLight = new THREE.PointLight(0x88aaff, 0.5);
        rimLight.position.set(1, 1.5, -2);
        scene.add(rimLight);
        
        let quakeMarkers = null;
        
        function getMarkerSize(mag) {
            const base = 0.014;
            const scale = Math.pow(2, (mag - 5.5) / 2.2);
            return Math.min(base * scale, 0.11);
        }
        
        function latLonToVector3(lat, lon, radius = 1.001) {
            const phi = (90 - lat) * Math.PI / 180;
            const theta = -lon * Math.PI / 180;
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.cos(phi);
            const z = radius * Math.sin(phi) * Math.sin(theta);
            return new THREE.Vector3(x, y, z);
        }

        function getQuakeStableKey(quake, fallbackIndex = 0) {
            const eventId = quake?.id || quake?.properties?.code;
            if (eventId) return String(eventId);
            const coords = quake?.geometry?.coordinates || [0, 0, 0];
            const time = Number(quake?.properties?.time || 0);
            return `${Number(coords[0]).toFixed(3)}_${Number(coords[1]).toFixed(3)}_${time}_${fallbackIndex}`;
        }
        
        function updateGlobeMarkers(earthquakes) {
            if (quakeMarkers) {
                scene.remove(quakeMarkers);
                if (quakeMarkers.geometry) quakeMarkers.geometry.dispose();
                if (quakeMarkers.material) quakeMarkers.material.dispose();
            }
            if (!earthquakes || earthquakes.length === 0) return;
            
            const validQuakes = earthquakes.filter(q => {
                const coords = q.geometry.coordinates;
                return coords && !isNaN(coords[0]) && !isNaN(coords[1]);
            });
            if (validQuakes.length === 0) return;
            
            const group = new THREE.Group();
            validQuakes.forEach((quake, index) => {
                const coords = quake.geometry.coordinates;
                const lon = coords[0];
                const lat = coords[1];
                const mag = quake.properties.mag;
                const quakeKey = getQuakeStableKey(quake, index);
                const isSelected = selectedQuakeKey && quakeKey === selectedQuakeKey;
                const size = getMarkerSize(mag) * (isSelected ? 1.35 : 1);
                const position = latLonToVector3(lat, lon, 1.002);
                
                const material = new THREE.MeshStandardMaterial({
                    color: isSelected ? 0xffd84a : 0xff4444,
                    emissive: isSelected ? 0x6b5200 : 0x331100,
                    emissiveIntensity: isSelected ? 0.55 : 0.2,
                    roughness: 0.3,
                    metalness: 0.05
                });
                const sphere = new THREE.Mesh(new THREE.SphereGeometry(size, 18, 18), material);
                sphere.position.copy(position);
                group.add(sphere);
            });
            quakeMarkers = group;
            scene.add(quakeMarkers);
        }
        
        window.updateGlobeMarkers = updateGlobeMarkers;
        
        // 注释
        function formatLatLon(lat, lon) {
            const latAbs = Math.abs(lat).toFixed(1);
            const latDir = lat >= 0 ? 'N' : 'S';
            const lonAbs = Math.abs(lon).toFixed(1);
            const lonDir = lon >= 0 ? 'E' : 'W';
            return `${latAbs}°${latDir} , ${lonAbs}°${lonDir}`;
        }
        
        // 注释
        function getSubSolarPointLatLon() {
            const now = new Date();
            const utcHours = now.getUTCHours();
            const utcMinutes = now.getUTCMinutes();
            const utcSeconds = now.getUTCSeconds();
            const dayOfYear = Math.floor((now.getTime() - new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0)).getTime()) / (24 * 3600 * 1000)) + 1;
            const deltaDeg = -23.439 * Math.cos(2 * Math.PI / 365.25 * (dayOfYear + 10));
            const utcDecimal = utcHours + utcMinutes/60 + utcSeconds/3600;
            let lonDeg = (utcDecimal - 12) * 15;
            if (lonDeg > 180) lonDeg -= 360;
            if (lonDeg < -180) lonDeg += 360;
            return { lat: deltaDeg, lon: lonDeg };
        }
        
        // 鐠侊紕鐣绘径顏堟Ъ閺傜懓鎮滈崥鎴﹀櫤 (閻劋绨崗澶屽弾)
        function getSolarDirectionVector() {
            const now = new Date();
            const utcYear = now.getUTCFullYear();
            const utcMonth = now.getUTCMonth();
            const utcDate = now.getUTCDate();
            const utcHours = now.getUTCHours();
            const utcMinutes = now.getUTCMinutes();
            const utcSeconds = now.getUTCSeconds();
            
            const startOfYear = new Date(Date.UTC(utcYear, 0, 1, 0, 0, 0));
            const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 3600 * 1000)) + 1;
            
            const obliquityDeg = 23.439;
            const rad = Math.PI / 180;
            const deltaRad = -obliquityDeg * rad * Math.cos(2 * Math.PI / 365.25 * (dayOfYear + 10));
            
            const utcDecimalHour = utcHours + utcMinutes / 60 + utcSeconds / 3600;
            let subSolarLonDeg = (12 - utcDecimalHour) * -15;
            if (subSolarLonDeg > 180) subSolarLonDeg -= 360;
            if (subSolarLonDeg < -180) subSolarLonDeg += 360;
            const subSolarLonRad = subSolarLonDeg * rad;
            const subSolarLatRad = deltaRad;
            
            const cosLat = Math.cos(subSolarLatRad);
            const x = cosLat * Math.cos(subSolarLonRad);
            const y = Math.sin(subSolarLatRad);
            const z = cosLat * Math.sin(subSolarLonRad);
            
            return new THREE.Vector3(x, y, z).normalize();
        }
        
        let lastUpdateSecond = -1;
        function updateRealTimeSunlight() {
            const now = new Date();
            const currentSec = Math.floor(now.getTime() / 1000);
            if (currentSec === lastUpdateSecond) return;
            lastUpdateSecond = currentSec;
            
            const sunDir = getSolarDirectionVector();
            const distance = 8.5;
            const lightPos = sunDir.clone().multiplyScalar(distance);
            sunLight.position.copy(lightPos);
            sunLight.target = earth;
            sunLight.updateMatrixWorld();
            
            const sunY = sunDir.y;
            let ambientIntensity = 0.55;
            let backFillIntensity = 0.45;
            let rimIntensity = 0.4;
            if (sunY < -0.2) {
                ambientIntensity = 0.75;
                backFillIntensity = 0.8;
                rimIntensity = 0.65;
            } else if (sunY < 0.2) {
                ambientIntensity = 0.5;
                backFillIntensity = 0.42;
                rimIntensity = 0.38;
            } else {
                ambientIntensity = 0.55;
                backFillIntensity = 0.45;
                rimIntensity = 0.4;
            }
            ambientLight.intensity = ambientIntensity;
            backFillLight.intensity = backFillIntensity;
            rimLight.intensity = rimIntensity;
            
            const intensityBase = 1.3;
            const sunHeightFactor = Math.max(0.2, Math.min(1.2, (sunY + 0.5) * 0.9 + 0.6));
            sunLight.intensity = intensityBase * sunHeightFactor;
            
            // 注释
            const subPoint = getSubSolarPointLatLon();
            const tipDiv = document.getElementById('sunPosTip');
            if (tipDiv) {
                tipDiv.innerHTML = `☀️ 实时日照 | 直射点 ${formatLatLon(subPoint.lat, subPoint.lon)}<br>🕒 基于 UTC 时间`;
            }
        }
        // 注释
        function updateUITime() {
            const now = new Date();
            const utcStr = now.toUTCString();
            const sub = getSubSolarPointLatLon();
            const el = document.getElementById('realTimeDisplay');
            if (el) {
                el.innerHTML = `🕒 ${utcStr} | ☀️ 太阳直射: ${formatLatLon(sub.lat, sub.lon)}`;
            }
        }
        
        function animate() {
            requestAnimationFrame(animate);
            updateRealTimeSunlight();
            updateUITime();
            
            clouds.rotation.y += 0.0008;
            stars.rotation.y += 0.00015;
            stars.rotation.x += 0.00005;
            
            controls.update();
            renderer.render(scene, camera);
        }
        animate();
        
        window.addEventListener('resize', () => {
            const newW = container.clientWidth, newH = container.clientHeight;
            camera.aspect = newW / newH;
            camera.updateProjectionMatrix();
            renderer.setSize(newW, newH);
        });
        
        setTimeout(() => {
            updateRealTimeSunlight();
            updateUITime();
        }, 100);
        
        window.updateGlobeMarkers = updateGlobeMarkers;
    

        // 注释
        let mercatorSvg = null;
        let mercatorContainerEl = null;
        let currentProjection = null;
        let currentMercatorEarthquakes = [];
        let mercatorZoomBehavior = null;
        let currentMercatorTransform = d3.zoomIdentity;
        let mercatorViewportLayer = null;
        let mercatorMarkerLayer = null;
        const TERRAIN_BASEMAP_URL = 'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg';
        const TERRAIN_BASEMAP_ASPECT = 2;

        function getMercatorSize() {
            const width = Math.max(320, mercatorContainerEl?.clientWidth || 320);
            const height = Math.max(220, mercatorContainerEl?.clientHeight || 220);
            return { width, height };
        }

        function getTerrainProjection(width, height) {
            const frame = getTerrainFrame(width, height);
            return d3.geoEquirectangular().fitExtent(
                [[frame.x, frame.y], [frame.x + frame.width, frame.y + frame.height]],
                { type: 'Sphere' }
            );
        }

        function getTerrainFrame(width, height) {
            const frameByWidth = { w: width, h: width / TERRAIN_BASEMAP_ASPECT };
            const frameByHeight = { w: height * TERRAIN_BASEMAP_ASPECT, h: height };
            const useWidthLimited = frameByWidth.h <= height;
            const frameWidth = useWidthLimited ? frameByWidth.w : frameByHeight.w;
            const frameHeight = useWidthLimited ? frameByWidth.h : frameByHeight.h;
            const x = (width - frameWidth) / 2;
            const y = (height - frameHeight) / 2;
            return { x, y, width: frameWidth, height: frameHeight };
        }

        function drawMercatorMarkers(markerLayer, earthquakes, projection, width, height) {
            markerLayer.selectAll('*').remove();
            if (!earthquakes || earthquakes.length === 0) return;

            earthquakes.forEach((quake, index) => {
                const coords = quake?.geometry?.coordinates || [];
                const lon = Number(coords[0]);
                const lat = Number(coords[1]);
                const mag = Number(quake?.properties?.mag || 0);
                if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;

                const quakeKey = getQuakeStableKey(quake, index);
                const isSelected = selectedQuakeKey && quakeKey === selectedQuakeKey;
                const screenCoords = projection([lon, lat]);
                if (!screenCoords) return;
                const x = screenCoords[0];
                const y = screenCoords[1];
                if (!Number.isFinite(x) || !Number.isFinite(y)) return;
                if (x < -70 || x > width + 70 || y < -70 || y > height + 70) return;

                const radius = Math.min(2.4 * Math.pow(1.45, mag - 5.5), 13) * (isSelected ? 1.18 : 1);
                const group = markerLayer.append('g').attr('class', 'quake-marker');
                group.append('circle')
                    .attr('cx', x)
                    .attr('cy', y)
                    .attr('r', radius)
                    .attr('fill', isSelected ? '#facc15' : '#ff3333')
                    .attr('stroke', isSelected ? '#7c4a00' : '#ffffff')
                    .attr('stroke-width', isSelected ? 1.1 : 0.6)
                    .attr('opacity', 1);

                if (mag >= 6) {
                    group.append('text')
                        .attr('x', x + radius + 3)
                        .attr('y', y - 3)
                        .attr('fill', '#ff8888')
                        .attr('font-size', '9px')
                        .attr('font-weight', 'bold')
                        .attr('stroke', '#fff')
                        .attr('stroke-width', 0.3)
                        .text(mag.toFixed(1));
                }

                group.append('title')
                    .text(`${quake.properties.place}\n震级: M${mag.toFixed(1)}\n时间: ${new Date(quake.properties.time).toLocaleString()}`);
            });
        }

        function logProjectionReferencePoints(projection, width, height) {
            const refs = [
                { name: 'Singapore', lon: 103.8198, lat: 1.3521 },
                { name: 'Beijing', lon: 116.4074, lat: 39.9042 },
                { name: 'Norway(Oslo)', lon: 10.7522, lat: 59.9139 }
            ].map((point) => {
                const xy = projection([point.lon, point.lat]) || [NaN, NaN];
                return {
                    name: point.name,
                    lon: point.lon,
                    lat: point.lat,
                    x: Number(xy[0]).toFixed(2),
                    y: Number(xy[1]).toFixed(2),
                    inView: Number.isFinite(xy[0]) && Number.isFinite(xy[1]) && xy[0] >= 0 && xy[0] <= width && xy[1] >= 0 && xy[1] <= height
                };
            });
            console.table(refs);
        }

        function renderMercatorScene() {
            console.log('[mercator] renderMercatorScene called');
            if (!mercatorSvg || !mercatorContainerEl) {
                console.warn('[mercator] render skipped: svg or container missing.');
                return;
            }

            const { width, height } = getMercatorSize();
            if (!(width > 0 && height > 0)) {
                console.warn('[mercator] render skipped: invalid size.', { width, height });
                return;
            }

            mercatorSvg.attr('width', width).attr('height', height);
            currentProjection = getTerrainProjection(width, height);
            logProjectionReferencePoints(currentProjection, width, height);

            mercatorSvg.selectAll('*').remove();
            mercatorSvg
                .style('background-color', '#d9e9ff')
                .style('pointer-events', 'all');

            mercatorViewportLayer = mercatorSvg.append('g').attr('class', 'mercator-viewport-layer');
            const terrainFrame = getTerrainFrame(width, height);
            mercatorViewportLayer.append('image')
                .attr('class', 'mercator-terrain')
                .attr('href', TERRAIN_BASEMAP_URL)
                .attr('x', terrainFrame.x)
                .attr('y', terrainFrame.y)
                .attr('width', terrainFrame.width)
                .attr('height', terrainFrame.height)
                .attr('preserveAspectRatio', 'none');

            mercatorMarkerLayer = mercatorViewportLayer.append('g').attr('class', 'mercator-marker-layer');
            drawMercatorMarkers(mercatorMarkerLayer, currentMercatorEarthquakes, currentProjection, width, height);

            mercatorViewportLayer.attr('transform', currentMercatorTransform);
            console.log('[mercator] terrain + markers rendered');
        }

        function resetMercatorView() {
            if (!mercatorSvg || !mercatorZoomBehavior) return;
            mercatorSvg.transition().duration(260).call(mercatorZoomBehavior.transform, d3.zoomIdentity);
        }

        function bindMercatorZoom() {
            if (!mercatorSvg) return;
            mercatorZoomBehavior = d3.zoom()
                .scaleExtent([1, 12])
                .on('start', () => mercatorSvg.style('cursor', 'grabbing'))
                .on('zoom', (event) => {
                    currentMercatorTransform = event.transform;
                    if (mercatorViewportLayer) {
                        mercatorViewportLayer.attr('transform', currentMercatorTransform);
                    }
                })
                .on('end', () => mercatorSvg.style('cursor', 'grab'));

            mercatorSvg
                .call(mercatorZoomBehavior)
                .on('dblclick.zoom', null)
                .on('dblclick.reset', (event) => {
                    event.preventDefault();
                    resetMercatorView();
                });
        }

        function drawBaseMap() {
            console.log('[mercator] drawBaseMap called');
            if (!mercatorContainerEl) {
                console.warn('[mercator] container missing');
                return;
            }
            const { width, height } = getMercatorSize();
            if (!(width > 0 && height > 0)) {
                console.warn('[mercator] drawBaseMap skipped: invalid size.', { width, height });
                return;
            }
            mercatorSvg.attr('width', width).attr('height', height);
            renderMercatorScene();
        }

        function runWhenDOMReady(callback) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', callback, { once: true });
                return;
            }
            callback();
        }

        function initMercatorMap() {
            mercatorContainerEl = document.getElementById('mercatorContainer');
            if (!mercatorContainerEl) {
                console.warn('Mercator container not found');
                return;
            }

            const { width, height } = getMercatorSize();
            if (!(width > 0 && height > 0)) {
                console.warn('[mercator] init skipped: invalid initial size.', { width, height });
                return;
            }
            mercatorSvg = d3.select(mercatorContainerEl)
                .append('svg')
                .attr('width', width)
                .attr('height', height)
                .style('background-color', '#d9e9ff')
                .style('pointer-events', 'all')
                .style('cursor', 'grab');

            bindMercatorZoom();
            drawBaseMap();
            window.addEventListener('resize', () => drawBaseMap());
        }

        runWhenDOMReady(initMercatorMap);

        function updateMercatorMarkers(earthquakes) {
            currentMercatorEarthquakes = Array.isArray(earthquakes) ? earthquakes : [];
            if (!mercatorSvg || !currentProjection) return;
            if (mercatorMarkerLayer) {
                const { width, height } = getMercatorSize();
                drawMercatorMarkers(mercatorMarkerLayer, currentMercatorEarthquakes, currentProjection, width, height);
                return;
            }
            renderMercatorScene();
        }

        window.updateMercatorMarkers = updateMercatorMarkers;
    

        // 鐠侊紕鐣绘潻鍥у箵3楠炲娈戦弮銉︽埂閼煎啫娲?
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(endDate.getFullYear() - 3);
        
        function formatDate(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        // 注释
        function buildEarthquakeApiUrl(queryStartDate, queryEndDate, queryMinMag, queryMaxMag) {
            const formattedStart = formatDate(new Date(queryStartDate));
            const formattedEnd = formatDate(new Date(queryEndDate));
            const minMag = Math.max(0, queryMinMag || 5.5); // 最小值允许为 0
            const maxMag = Number.isFinite(queryMaxMag) ? queryMaxMag : '';
            const params = new URLSearchParams({
                start: formattedStart,
                end: formattedEnd,
                minMag: String(minMag)
            });
            if (maxMag !== '') params.set('maxMag', String(maxMag));
            return `/api/earthquakes?${params.toString()}`;
        }
        
        const apiUrl = buildEarthquakeApiUrl(startDate, endDate, 5.5, Infinity);
        
        window.currentEarthquakeData = [];
        let currentSortState = { field: 'mag', order: 'desc' };
        let currentListRenderVersion = 0;
        let lastFilterParams = null;
        const TABLE_COLSPAN = 5;

        function getSortValue(quake, field) {
            if (field === 'time') return Number(quake?.properties?.time || 0);
            return Number(quake?.properties?.mag || 0);
        }

        function sortEarthquakes(quakes, sortState = currentSortState) {
            const list = [...(quakes || [])];
            const { field, order } = sortState;
            const factor = order === 'asc' ? 1 : -1;
            list.sort((a, b) => (getSortValue(a, field) - getSortValue(b, field)) * factor);
            return list;
        }

        function updateSortButtonActiveState() {
            const buttons = document.querySelectorAll('.sort-btn[data-sort-field][data-sort-order]');
            buttons.forEach(btn => {
                const field = btn.getAttribute('data-sort-field');
                const order = btn.getAttribute('data-sort-order');
                const active = field === currentSortState.field && order === currentSortState.order;
                btn.classList.toggle('active', active);
                btn.setAttribute('aria-pressed', active ? 'true' : 'false');
            });
        }

        function applyCurrentView(extraMessage = '') {
            const sorted = sortEarthquakes(originalEarthquakeData || []);
            const finalDisplayData = getFinalDisplayEarthquakes(sorted);
            displayEarthquakes({ features: finalDisplayData });
            updateStats(finalDisplayData);
            if (window.updateGlobeMarkers) window.updateGlobeMarkers(finalDisplayData);
            if (window.updateMercatorMarkers) window.updateMercatorMarkers(finalDisplayData);

            updateSortButtonActiveState();

            if (extraMessage) {
                setFilterMessage(`${extraMessage}（当前显示 ${finalDisplayData.length} 条）`, 'info');
            }
        }

        function setSort(field, order) {
            currentSortState = { field, order };
            applyCurrentView(`排序已切换：${field === 'mag' ? '震级' : '时间'}${order === 'asc' ? '正序' : '逆序'}`);
        }

        function bindSortControls() {
            const wrap = document.getElementById('quakeSortControls');
            if (!wrap) return;

            wrap.addEventListener('click', (e) => {
                const btn = e.target.closest('.sort-btn[data-sort-field][data-sort-order]');
                if (!btn) return;
                setSort(btn.getAttribute('data-sort-field'), btn.getAttribute('data-sort-order'));
            });
            updateSortButtonActiveState();
        }
        
        function getMagnitudeLevel(mag) {
            if (mag >= 7) return 'mag-high';
            if (mag >= 6) return 'mag-mid';
            return 'mag-low';
        }
        
        function formatTime(timestamp) {
            const date = new Date(timestamp);
            return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
        }

        function formatRelativeTime(timestamp) {
            if (!timestamp) return '-';
            const now = Date.now();
            const diffMs = now - Number(timestamp);
            const absMs = Math.abs(diffMs);
            const minute = 60 * 1000;
            const hour = 60 * minute;
            const day = 24 * hour;
            const suffix = diffMs >= 0 ? '前' : '后';

            if (absMs < minute) return '刚刚';
            if (absMs < hour) return `${Math.floor(absMs / minute)} 分钟${suffix}`;
            if (absMs < day) return `${Math.floor(absMs / hour)} 小时${suffix}`;
            if (absMs < 30 * day) return `${Math.floor(absMs / day)} 天${suffix}`;
            return formatTime(timestamp);
        }
        
        function updateStats(quakes) {
            if (!quakes || quakes.length === 0) {
                document.getElementById('totalCount').textContent = '0';
                document.getElementById('avgMagnitude').textContent = '-';
                document.getElementById('maxMagnitude').textContent = '-';
                return;
            }
            const total = quakes.length;
            let sumMag = 0, maxMag = 0;
            for (const q of quakes) {
                const mag = q.properties.mag;
                sumMag += mag;
                if (mag > maxMag) maxMag = mag;
            }
            document.getElementById('totalCount').textContent = total;
            document.getElementById('avgMagnitude').textContent = (sumMag / total).toFixed(1);
            document.getElementById('maxMagnitude').textContent = maxMag.toFixed(1);
        }

        function getPlaceCacheKey(originalPlace, lat, lng) {
            const roundedLat = Number(lat).toFixed(3);
            const roundedLng = Number(lng).toFixed(3);
            return `${originalPlace}__${roundedLat},${roundedLng}`;
        }

        function escapeHtml(text) {
            return String(text)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function renderTableSkeletonRow() {
            return `
                <tr class="skeleton-row">
                    <td><div class="skeleton sm"></div></td>
                    <td><div class="skeleton lg"></div></td>
                    <td><div class="skeleton md"></div></td>
                    <td><div class="skeleton xs"></div></td>
                    <td><div class="skeleton xs"></div></td>
                </tr>
            `;
        }

        function renderTableLoading(text = '🔄 正在加载地震数据...') {
            const quakeListDiv = document.getElementById('quakeList');
            if (!quakeListDiv) return;
            quakeListDiv.innerHTML = `
                ${renderTableSkeletonRow()}
                ${renderTableSkeletonRow()}
                ${renderTableSkeletonRow()}
                <tr><td class="table-state" colspan="${TABLE_COLSPAN}">${escapeHtml(text)}</td></tr>
            `;
        }

        function renderTableError(message, retryHandlerName) {
            const quakeListDiv = document.getElementById('quakeList');
            if (!quakeListDiv) return;
            quakeListDiv.innerHTML = `
                <tr>
                    <td class="table-state" colspan="${TABLE_COLSPAN}">
                        ❌ ${escapeHtml(message)}
                        <br>
                        <button type="button" class="retry-btn" onclick="${retryHandlerName}()">重试</button>
                    </td>
                </tr>
            `;
        }

        function buildMagnitudeChip(mag) {
            const level = getMagnitudeLevel(mag);
            return `<span class="magnitude-chip ${level}"><span class="magnitude-dot"></span>M${Number(mag || 0).toFixed(1)}</span>`;
        }

        async function copyPlace(event, index) {
            event?.stopPropagation?.();
            const quake = window.currentEarthquakeData?.[index];
            const place = quake?.properties?.place || '未知地点';
            try {
                await navigator.clipboard.writeText(place);
                setFilterMessage(`已复制地点：${place}`, 'success');
            } catch (error) {
                setFilterMessage('复制失败，请手动复制', 'error');
            }
        }

        function locateQuake(event, index) {
            event?.stopPropagation?.();
            const quake = window.currentEarthquakeData?.[index];
            if (!quake) return;
            selectedQuakeKey = getQuakeStableKey(quake, index);
            applyCurrentView();
            const mapWrap = document.querySelector('.maps-container');
            if (mapWrap) {
                mapWrap.classList.add('is-focusing');
                mapWrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => mapWrap.classList.remove('is-focusing'), 1200);
            }
            showQuakeDetail(index);
        }

        async function displayEarthquakes(data) {
            let quakes = data.features;
            const quakeListDiv = document.getElementById('quakeList');
            const renderVersion = ++currentListRenderVersion;

            if (!quakes || quakes.length === 0) {
                const domesticOnlyEnabled = document.getElementById('domesticOnlyToggle')?.checked;
                quakeListDiv.innerHTML = domesticOnlyEnabled
                    ? `<tr><td class="table-state" colspan="${TABLE_COLSPAN}">📭 筛选后暂无国内地震数据</td></tr>`
                    : `<tr><td class="table-state" colspan="${TABLE_COLSPAN}">📭 暂无地震数据</td></tr>`;
                return;
            }

            window.currentEarthquakeData = quakes;
            const domesticOnlyEnabled = document.getElementById('domesticOnlyToggle')?.checked;

            let html = '';
            for (let i = 0; i < quakes.length; i++) {
                const quake = quakes[i];
                const props = quake.properties;
                const mag = props.mag;
                const clickAttr = ` onclick="showQuakeDetail(${i})"`;
                const quakeKey = getQuakeStableKey(quake, i);
                const isSelected = selectedQuakeKey && quakeKey === selectedQuakeKey;
                const classList = `${isSelected ? 'quake-row-selected' : ''}`.trim();
                const classAttr = classList ? ` class="${classList}"` : '';
                const placeText = props.place || '未知地点';
                const placeEsc = escapeHtml(placeText);
                const placeKey = getPlaceCacheKey(placeText, quake.geometry.coordinates[1], quake.geometry.coordinates[0]);
                const placeKeyEsc = escapeHtml(placeKey);
                const fullTime = new Date(props.time).toLocaleString();
                const relativeTime = formatRelativeTime(props.time);

                html += `
                    <tr${classAttr}${clickAttr} data-quake-index="${i}">
                        <td data-label="震级">${buildMagnitudeChip(mag)}</td>
                        <td data-label="地点" class="place" data-orig-place="${placeEsc}" data-place-key="${placeKeyEsc}" data-lat="${quake.geometry.coordinates[1]}" data-lng="${quake.geometry.coordinates[0]}">📍 ${placeEsc}</td>
                        <td data-label="时间" class="time-cell" title="${fullTime}">🕒 ${relativeTime}</td>
                        <td data-label="海啸"><span class="tsunami ${props.tsunami === 1 ? 'tsunami-yes' : 'tsunami-no'}">${props.tsunami === 1 ? '⚠️ 有' : '无'}</span></td>
                        <td data-label="操作">
                            <div class="row-actions">
                                <button type="button" class="action-icon" title="复制地点" onclick="copyPlace(event, ${i})">📋</button>
                                <button type="button" class="action-icon" title="在地图定位" onclick="locateQuake(event, ${i})">🧭</button>
                            </div>
                        </td>
                    </tr>
                `;
            }

            quakeListDiv.innerHTML = html;

            try {
                if (domesticOnlyEnabled) translateVisiblePlacesWithAmap(renderVersion);
            } catch (e) {
                console.warn('translateVisiblePlacesWithAmap error', e);
            }
        }

        const PLACE_TRANSLATION_CACHE_KEY = 'placeTranslations_v2';

        const TRANSLATE_API_URL = '/api/translate';
        const SUMMARY_API_URL = '/api/generate-summary';

        // 注释
        // 注释
        const CHINA_FILTER_BBOX = {
            minLng: 70.0,
            maxLng: 135.0,
            minLat: 3.0,
            maxLat: 54.0
        };

        const CHINA_BOUNDARY_POLYGONS = [
            // CHN mainland
            [[78.917694, 33.386258], [78.721117, 33.994386], [78.976192, 34.309173], [78.296027, 34.624658], [78.044259, 35.491633], [76.166027, 35.806239], [75.849768, 36.644741], [74.38257, 37.126572], [75.164125, 37.400638], [74.891893, 37.599205], [74.835773, 38.455173], [73.816403, 38.586586], [73.632642, 39.448343], [73.976704, 40.043603], [74.835359, 40.511637], [75.559863, 40.63287], [75.681819, 40.291702], [76.313512, 40.343327], [76.860972, 41.013208], [78.074955, 41.039512], [78.658278, 41.532453], [80.231206, 42.033689], [80.143769, 42.644762], [80.793445, 43.14946], [80.338899, 44.121494], [80.492275, 44.727969], [79.858205, 44.90372], [81.665227, 45.347982], [82.539747, 45.123655], [82.631989, 45.415834], [82.291493, 45.533191], [83.021475, 47.205905], [84.739613, 46.814766], [85.498636, 47.051832], [85.718674, 48.358832], [86.565083, 48.527323], [86.859483, 49.105324], [87.816324, 49.165837], [87.983032, 48.552335], [90.3448, 47.658642], [91.047496, 46.566409], [90.651138, 45.493142], [90.873243, 45.186184], [93.525278, 44.951263], [95.397722, 44.280502], [95.318967, 44.017108], [96.357767, 42.724499], [101.524945, 42.537456], [102.034164, 42.18461], [104.97383, 41.586145], [106.767829, 42.286619], [110.406728, 42.768605], [111.933353, 43.696636], [111.397055, 44.387369], [111.958261, 45.084536], [113.604776, 44.739699], [114.533711, 45.3855], [115.667389, 45.454281], [116.568316, 46.290871], [117.393795, 46.57137], [119.85442, 46.65966], [119.699959, 47.159526], [118.542252, 47.966246], [115.914506, 47.683912], [115.51422, 48.131637], [116.684278, 49.823265], [117.836869, 49.50902], [119.31621, 50.092654], [119.137565, 50.392532], [120.77917, 52.117595], [120.72398, 52.542169], [120.032962, 52.760657], [120.874255, 53.28016], [123.614294, 53.563347], [125.621355, 53.062137], [126.555975, 52.130643], [127.590641, 50.208719], [127.538654, 49.789934], [130.674328, 48.870817], [130.674742, 48.063941], [131.023351, 47.682284], [132.524655, 47.707528], [133.091958, 48.10678], [134.718733, 48.263412], [134.772579, 47.710732], [134.183571, 47.3275], [133.902452, 46.258986], [133.09878, 45.10779], [131.853068, 45.337596], [130.933434, 44.841708], [131.280906, 43.380221], [131.103036, 42.910431], [130.407161, 42.735377], [130.530771, 42.53048], [129.879751, 42.996033], [129.703328, 42.442372], [128.034593, 41.993743], [128.14611, 41.376339], [126.679482, 41.735981], [126.007843, 40.899313], [124.137218, 39.842353], [123.252045, 39.817084], [121.179535, 38.720933], [121.117931, 38.943427], [121.942963, 39.399359], [121.223399, 39.528632], [122.30185, 40.502346], [121.867931, 40.995795], [120.981944, 40.826809], [118.926036, 39.130601], [117.715424, 39.111396], [117.716082, 38.378511], [118.950037, 38.097262], [119.259597, 37.715847], [118.969981, 37.593451], [119.145518, 37.17886], [119.7706, 37.151842], [120.738048, 37.83397], [121.570323, 37.428656], [122.688243, 37.409817], [122.507416, 36.898017], [120.75058, 36.616848], [120.949962, 36.459174], [120.627778, 36.116523], [120.097179, 36.226386], [120.298839, 35.973131], [119.192882, 35.000434], [119.192231, 34.718207], [120.257091, 34.311835], [120.830333, 32.697659], [121.922057, 31.754378], [120.131358, 31.943183], [119.612885, 32.35456], [120.006396, 31.950305], [120.750354, 31.978336], [121.95082, 30.982081], [120.147094, 30.198891], [120.621606, 30.372563], [120.792247, 30.066067], [121.254102, 30.348393], [122.129143, 29.903777], [121.44337, 29.524237], [121.971202, 29.593329], [121.942963, 29.195868], [121.408539, 29.161119], [121.62143, 28.735907], [121.142345, 28.845852], [121.656342, 28.339301], [121.345795, 28.145168], [121.168956, 28.384833], [120.965228, 27.987145], [120.559581, 28.112779], [120.868364, 27.882559], [120.517833, 27.201606], [120.195811, 27.297797], [120.421723, 27.146959], [120.031993, 26.899888], [120.134369, 26.646064], [119.552094, 26.749091], [119.681895, 26.317125], [119.949962, 26.364936], [119.458507, 25.982489], [119.093516, 26.145819], [119.695404, 26.002631], [119.449067, 25.687161], [119.654552, 25.35814], [119.305186, 25.60456], [119.10255, 25.420315], [119.344249, 25.242377], [118.87558, 25.243842], [119.01767, 24.960273], [118.572032, 24.885199], [118.620453, 24.545478], [117.79127, 24.467475], [118.126475, 24.26203], [117.591669, 23.737064], [117.416596, 23.946845], [117.257093, 23.615616], [116.523204, 23.418524], [116.804822, 23.236122], [116.508881, 23.234117], [116.494688, 22.939352], [113.890345, 22.452712], [113.528819, 23.01081], [113.830089, 23.117499], [113.417491, 23.096991], [113.212983, 22.904527], [113.59917, 22.57518], [113.483745, 22.155142], [113.165294, 22.575588], [113.401971, 22.179574], [112.911586, 21.856291], [112.550873, 21.772854], [112.397472, 22.068508], [112.286225, 21.708808], [111.890391, 21.925116], [111.630463, 21.529853], [110.431163, 21.191474], [110.35849, 21.435736], [110.156749, 20.848863], [110.53419, 20.478258], [110.280284, 20.252997], [109.917247, 20.239325], [109.661225, 20.927558], [109.944428, 21.493109], [109.594493, 21.746405], [109.138682, 21.401597], [108.573334, 21.951809], [108.470958, 21.561998], [107.348155, 21.599355], [106.653107, 21.968893], [106.526913, 22.43827], [106.789843, 22.797188], [105.853879, 22.90465], [105.312155, 23.36581], [103.959525, 22.507103], [103.646934, 22.799049], [103.029039, 22.430157], [102.467781, 22.768586], [102.218029, 22.410675], [101.689121, 22.478887], [101.75599, 21.143258], [101.244342, 21.192868], [101.082801, 21.766735], [100.162496, 21.436367], [99.942406, 22.045529], [99.14447, 22.153533], [99.538038, 22.926431], [98.859009, 23.179387], [98.658815, 23.961123], [98.865727, 24.145685], [97.516456, 23.942829], [97.800986, 25.237634], [98.690234, 25.865554], [98.679279, 27.577336], [98.294703, 27.536615], [97.670451, 28.511284], [97.323496, 28.217478], [96.301852, 28.420711], [96.592584, 28.757884], [96.195323, 28.941106], [96.366241, 29.257233], [96.141966, 29.368467], [95.367406, 29.036496], [94.599941, 29.316635], [92.683674, 27.91045], [91.952247, 27.72482], [90.225591, 28.358399], [89.561489, 28.13464], [88.971933, 27.312385], [88.610488, 28.105831], [87.369116, 27.803937], [86.15596, 28.156525], [85.98026, 27.885172], [85.692939, 28.335222], [85.087395, 28.304113], [85.160982, 28.595], [84.450845, 28.73388], [84.08973, 29.256613], [83.523718, 29.183594], [82.088767, 30.330088], [81.387518, 30.373909], [81.097768, 30.016929], [79.131397, 31.438433], [78.745095, 31.308116], [78.384807, 32.547549], [78.943429, 32.346373], [79.620673, 32.728725], [79.456096, 33.250399], [78.917694, 33.386258]],
            // CHN Hainan
            [[111.010509, 19.683783], [110.479177, 19.169257], [110.534434, 18.785631], [110.03419, 18.511949], [110.040294, 18.38227], [109.746104, 18.395901], [109.708751, 18.207221], [108.684906, 18.515204], [108.626964, 19.27497], [109.307384, 19.711127], [109.163341, 19.724799], [109.255138, 19.898342], [109.581716, 19.855699], [109.527029, 19.951361], [109.719005, 20.010647], [109.990082, 19.905951], [110.156993, 20.067369], [110.417735, 19.923407], [110.382986, 20.081041], [110.605805, 19.923163], [110.677908, 20.16356], [110.934581, 19.995063], [111.010509, 19.683783]],
            // CHN nearshore island
            [[121.844075, 31.607947], [121.986598, 31.503897], [121.817326, 31.44665], [121.176288, 31.784323], [121.322564, 31.829331], [121.844075, 31.607947]],
            // TWN main island
            [[121.905772, 24.9501], [121.400076, 23.145494], [120.948253, 22.526801], [120.840343, 21.904608], [120.714366, 21.937486], [120.621267, 22.295071], [120.055186, 23.043687], [120.184418, 23.76439], [121.059337, 25.050238], [121.580821, 25.283026], [121.905121, 25.106594], [121.905772, 24.9501]],
            // TWN outlying island
            [[118.394216, 24.522691], [118.463356, 24.431523], [118.283946, 24.401272], [118.282074, 24.477362], [118.381414, 24.473511], [118.394216, 24.522691]],
            // HKG main
            [[114.229828, 22.555813], [114.335134, 22.506415], [114.167491, 22.448065], [114.209321, 22.398668], [114.323741, 22.480048], [114.39975, 22.436143], [114.357595, 22.332424], [114.318614, 22.38939], [114.258393, 22.362087], [114.296723, 22.258287], [114.255544, 22.322333], [114.171886, 22.288723], [114.104828, 22.369859], [113.896983, 22.408759], [114.229828, 22.555813]],
            // HKG island
            [[113.846446, 22.197089], [113.892507, 22.292711], [114.054861, 22.33633], [114.000173, 22.216132], [113.846446, 22.197089]],
            // MAC main
            [[113.558604, 22.163031], [113.587494, 22.124864], [113.546804, 22.105373], [113.532237, 22.152615], [113.558604, 22.163031]],
            // MAC reclaimed
            [[113.536469, 22.217068], [113.55714, 22.20246], [113.52475, 22.173733], [113.536469, 22.217068]]
        ];

        // 注释
        // 鐠囧瓨妲戦敍?
        // 注释
        // 注释
        const CHINA_SEA_POLYGONS = [
            // 注释
            [[117.2, 37.0], [122.8, 37.0], [122.8, 41.3], [117.2, 41.3], [117.2, 37.0]],
            // 注释
            [[118.6, 31.6], [121.6, 31.5], [124.1, 33.0], [124.8, 35.5], [124.8, 38.8], [123.6, 40.5], [121.2, 40.7], [119.3, 39.1], [118.7, 36.1], [118.6, 31.6]],
            // 注释
            [[120.8, 23.8], [123.2, 23.8], [125.6, 25.0], [126.4, 27.6], [126.0, 30.2], [124.2, 31.8], [121.3, 30.8], [120.7, 27.4], [120.8, 23.8]],
            // 注释
            [[111.2, 18.3], [114.6, 18.0], [114.8, 15.8], [112.6, 15.1], [111.3, 16.1], [111.2, 18.3]],
            // 注释
            [[115.0, 17.5], [118.4, 17.2], [118.8, 15.0], [116.0, 14.2], [115.0, 17.5]],
            // 注释
            [[110.5, 12.8], [116.8, 12.5], [117.2, 8.0], [113.8, 5.0], [110.0, 6.2], [109.6, 9.5], [110.5, 12.8]]
        ];

        // 注释
        const CHINA_SEA_EXCLUSION_POLYGONS = [
            // 注释
            [[126.3, 24.0], [131.5, 24.0], [131.5, 29.2], [126.3, 29.2], [126.3, 24.0]],
            // 注释
            [[117.2, 7.8], [121.8, 7.8], [121.8, 16.8], [117.2, 16.8], [117.2, 7.8]],
            // 注释
            [[108.2, 10.2], [113.8, 10.2], [113.8, 18.6], [108.2, 18.6], [108.2, 10.2]]
        ];

        function buildPolygonBBoxes(polygons) {
            return polygons.map(polygon => {
                let minLng = Infinity;
                let maxLng = -Infinity;
                let minLat = Infinity;
                let maxLat = -Infinity;
                for (const [lng, lat] of polygon) {
                    if (lng < minLng) minLng = lng;
                    if (lng > maxLng) maxLng = lng;
                    if (lat < minLat) minLat = lat;
                    if (lat > maxLat) maxLat = lat;
                }
                return { minLng, maxLng, minLat, maxLat };
            });
        }

        const CHINA_LAND_POLYGON_BBOXES = buildPolygonBBoxes(CHINA_BOUNDARY_POLYGONS);
        const CHINA_SEA_POLYGON_BBOXES = buildPolygonBBoxes(CHINA_SEA_POLYGONS);
        const CHINA_SEA_EXCLUSION_BBOXES = buildPolygonBBoxes(CHINA_SEA_EXCLUSION_POLYGONS);

        function isPointInAnyPolygons(lng, lat, polygons, polygonBBoxes) {
            for (let i = 0; i < polygons.length; i++) {
                const box = polygonBBoxes[i];
                if (
                    lng < box.minLng || lng > box.maxLng ||
                    lat < box.minLat || lat > box.maxLat
                ) {
                    continue;
                }
                if (pointInPolygon(lng, lat, polygons[i])) {
                    return true;
                }
            }
            return false;
        }

        function isPointOnSegment(px, py, x1, y1, x2, y2, epsilon = 1e-9) {
            const cross = (px - x1) * (y2 - y1) - (py - y1) * (x2 - x1);
            if (Math.abs(cross) > epsilon) return false;
            const dot = (px - x1) * (px - x2) + (py - y1) * (py - y2);
            return dot <= epsilon;
        }

        function pointInPolygon(lng, lat, polygon) {
            let inside = false;
            for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
                const [xi, yi] = polygon[i];
                const [xj, yj] = polygon[j];

                if (isPointOnSegment(lng, lat, xi, yi, xj, yj)) return true;

                const intersects = ((yi > lat) !== (yj > lat))
                    && (lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi);
                if (intersects) inside = !inside;
            }
            return inside;
        }

        function isInChinaDomain(lng, lat) {
            if (!Number.isFinite(lng) || !Number.isFinite(lat)) return false;

            // 1) 閻晛鑸扮划妤冪摣
            if (
                lng < CHINA_FILTER_BBOX.minLng ||
                lng > CHINA_FILTER_BBOX.maxLng ||
                lat < CHINA_FILTER_BBOX.minLat ||
                lat > CHINA_FILTER_BBOX.maxLat
            ) {
                return false;
            }

            // 注释
            const inLand = isPointInAnyPolygons(lng, lat, CHINA_BOUNDARY_POLYGONS, CHINA_LAND_POLYGON_BBOXES);
            if (inLand) return true;

            // 注释
            const inSea = isPointInAnyPolygons(lng, lat, CHINA_SEA_POLYGONS, CHINA_SEA_POLYGON_BBOXES);
            if (!inSea) return false;

            const inSeaExclusion = isPointInAnyPolygons(lng, lat, CHINA_SEA_EXCLUSION_POLYGONS, CHINA_SEA_EXCLUSION_BBOXES);
            return !inSeaExclusion;
        }

        // 注释
        function isInChinaBoundary(lng, lat) {
            return isInChinaDomain(lng, lat);
        }

        function loadTranslationCache() {
            try {
                const raw = localStorage.getItem(PLACE_TRANSLATION_CACHE_KEY);
                return raw ? JSON.parse(raw) : {};
            } catch (e) { return {}; }
        }

        function saveTranslationCache(cache) {
            try { localStorage.setItem(PLACE_TRANSLATION_CACHE_KEY, JSON.stringify(cache)); } catch (e) { }
        }

        function containsChinese(text) {
            return /[\u4e00-\u9fff]/.test(text);
        }

        // 注释
        function isChinaDomesticEarthquake(lat, lng) {
            const isDomestic = isInChinaBoundary(lng, lat);
            console.log(`[isChinaDomesticEarthquake] local check lat=${lat}, lng=${lng}, isDomestic=${isDomestic}`);
            return isDomestic;
        }

        // 注释
        function filterDomesticEarthquakes(quakes) {
            return quakes.filter(quake => {
                const lat = quake.geometry.coordinates[1];
                const lng = quake.geometry.coordinates[0];
                return isChinaDomesticEarthquake(lat, lng);
            });
        }

        function getFinalDisplayEarthquakes(quakes) {
            const domesticOnlyEnabled = document.getElementById('domesticOnlyToggle')?.checked;
            return domesticOnlyEnabled ? filterDomesticEarthquakes(quakes) : quakes;
        }

        // 注释
        async function getAddressFromCoords(lat, lng, originalPlace) {
            try {
                const response = await fetch(TRANSLATE_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ lat, lng, originalPlace })
                });
                if (!response.ok) return null;
                const data = await response.json();
                return data?.translatedPlace || null;
            } catch (e) {
                console.warn(`[translate-api] error:`, e.message);
                return null;
            }
        }

        // 注释
        async function translateLocationWithAmap(lat, lng, originalPlace) {
            console.log(`[translateLocationWithAmap] start: lat=${lat}, lng=${lng}, orig="${originalPlace}"`);
            
            try {
                if (!isInChinaBoundary(lng, lat)) {
                    console.log(`[translateLocationWithAmap] local boundary says non-china, keep original`);
                    return originalPlace;
                }

                const translated = await getAddressFromCoords(lat, lng, originalPlace);
                console.log(`[translateLocationWithAmap] translate API result:`, translated);
                if (translated && translated.trim()) {
                    return translated.trim();
                }
            } catch (e) {
                console.warn(`[translateLocationWithAmap] translate exception:`, e.message);
            }

            console.log(`[translateLocationWithAmap] non-china earthquake or translate failed, returning original: "${originalPlace}"`);
            return originalPlace;
        }

                // 注释

        async function translateVisiblePlacesWithAmap(renderVersion = currentListRenderVersion) {
            const elems = Array.from(document.querySelectorAll('.place[data-orig-place][data-lat][data-lng]'));
            console.log(`[translateList] starting with ${elems.length} elements, renderVersion=${renderVersion}`);
            if (!elems.length) return;

            const cache = loadTranslationCache();
            const batchSize = 4;
            let cacheDirty = false;

            for (let i = 0; i < elems.length; i += batchSize) {
                if (renderVersion !== currentListRenderVersion) {
                    console.log('[translateList] stale render detected, stop translating current batch');
                    return;
                }

                const batch = elems.slice(i, i + batchSize).map(async el => {
                    try {
                        const orig = (el.getAttribute('data-orig-place') || '').trim();
                        const lat = parseFloat(el.getAttribute('data-lat'));
                        const lng = parseFloat(el.getAttribute('data-lng'));
                        const placeKey = el.getAttribute('data-place-key') || getPlaceCacheKey(orig, lat, lng);

                        if (!orig || Number.isNaN(lat) || Number.isNaN(lng)) return;
                        if (containsChinese(orig)) return;
                        if (!isInChinaBoundary(lng, lat)) return;

                        if (cache[placeKey]) {
                            if (renderVersion === currentListRenderVersion) {
                                el.textContent = `📍 ${cache[placeKey]}`;
                            }
                            return;
                        }

                        const translated = await translateLocationWithAmap(lat, lng, orig);
                        const finalText = (translated || orig).trim();
                        cache[placeKey] = finalText;
                        cacheDirty = true;

                        if (renderVersion === currentListRenderVersion) {
                            el.textContent = `📍 ${finalText}`;
                        }
                    } catch (e) {
                        console.warn('[translateList] single item failed:', e?.message || e);
                    }
                });
                await Promise.all(batch);
            }

            if (cacheDirty) saveTranslationCache(cache);
            console.log('[translateList] translation batch complete');
        }

        async function translateVisiblePlaces() {
            const elems = Array.from(document.querySelectorAll('.place[data-orig-place]'));
            if (!elems.length) return;
            const cache = loadTranslationCache();
            const batchSize = 5;
            for (let i = 0; i < elems.length; i += batchSize) {
                const batch = elems.slice(i, i + batchSize).map(async el => {
                    try {
                        const orig = el.getAttribute('data-orig-place') || '';
                        if (!orig) return;
                        if (containsChinese(orig)) return;
                        if (cache[orig]) {
                            el.innerHTML = '📍 ' + cache[orig];
                            return;
                        }
                        el.innerHTML = '?? ' + orig;
                    } catch (e) { /* ignore per-item errors */ }
                });
                await Promise.all(batch);
            }
        }

        async function fetchEarthquakeSummary(payload) {
            const response = await fetch(SUMMARY_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            const summaryText = (data?.summary || '').trim();
            if (!summaryText) {
                throw new Error('AI summary is empty');
            }
            return summaryText;
        }

        function sanitizeHttpUrl(url) {
            const candidate = String(url || '').trim();
            if (!candidate) return '';
            try {
                const parsed = new URL(candidate);
                if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
                    return parsed.href;
                }
            } catch (e) {}
            return '';
        }

        function renderSummaryLineWithLinks(lineText) {
            const rawText = String(lineText || '');
            const pattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>"'）)\]]+)/g;
            let html = '';
            let lastIndex = 0;
            let match = null;

            while ((match = pattern.exec(rawText)) !== null) {
                html += escapeHtml(rawText.slice(lastIndex, match.index));

                if (match[2]) {
                    const safeUrl = sanitizeHttpUrl(match[2]);
                    const label = escapeHtml(match[1] || match[2]);
                    html += safeUrl
                        ? `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">${label}</a>`
                        : label;
                } else {
                    const rawUrl = match[3];
                    const safeUrl = sanitizeHttpUrl(rawUrl);
                    const label = escapeHtml(rawUrl);
                    html += safeUrl
                        ? `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">${label}</a>`
                        : label;
                }

                lastIndex = pattern.lastIndex;
            }

            html += escapeHtml(rawText.slice(lastIndex));
            return html;
        }

        function renderAiSummary(summaryText) {
            const normalized = String(summaryText || '').replace(/\r\n/g, '\n').trim();
            if (!normalized) return '暂无解读内容';
            return normalized
                .split('\n')
                .map(renderSummaryLineWithLinks)
                .join('<br>');
        }

        // 注释
        async function showQuakeDetail(index) {
            const quake = window.currentEarthquakeData[index];
            if (!quake) return;

            const props = quake.properties || {};
            const geometry = quake.geometry || {};
            const coords = geometry.coordinates || [0, 0, 0];
            const originalPlace = props.place || '未知地点';
            const lat = Number(coords[1]);
            const lng = Number(coords[0]);

            let placeText = originalPlace;
            try {
                const domesticOnlyEnabled = document.getElementById('domesticOnlyToggle')?.checked;
                if (domesticOnlyEnabled && originalPlace) {
                    placeText = await translateLocationWithAmap(lat, lng, originalPlace);
                }
            } catch (e) {
                console.warn('place translation failed', e);
            }

            document.getElementById('quakeDetailTitle').textContent = `M${Number(props.mag || 0).toFixed(1)} 级地震详情`;

            const detailGrid = document.getElementById('quakeDetailGrid');
            detailGrid.innerHTML = `
                <div class="quake-detail-item"><div class="quake-detail-label">震级</div><div class="quake-detail-value">M${Number(props.mag || 0).toFixed(1)}</div></div>
                <div class="quake-detail-item"><div class="quake-detail-label">位置</div><div class="quake-detail-value">${escapeHtml(placeText)}</div></div>
                <div class="quake-detail-item"><div class="quake-detail-label">经度</div><div class="quake-detail-value">${Number(coords[0] || 0).toFixed(4)}°</div></div>
                <div class="quake-detail-item"><div class="quake-detail-label">纬度</div><div class="quake-detail-value">${Number(coords[1] || 0).toFixed(4)}°</div></div>
                <div class="quake-detail-item"><div class="quake-detail-label">深度</div><div class="quake-detail-value">${Number(coords[2] || 0).toFixed(1)} km</div></div>
                <div class="quake-detail-item"><div class="quake-detail-label">时间</div><div class="quake-detail-value">${new Date(props.time).toLocaleString()}</div></div>
                <div class="quake-detail-item"><div class="quake-detail-label">海啸风险</div><div class="quake-detail-value">${props.tsunami === 1 ? '⚠️ 有海啸风险' : '无海啸风险'}</div></div>
                <div class="quake-detail-item"><div class="quake-detail-label">数据来源</div><div class="quake-detail-value">USGS</div></div>
            `;

            document.getElementById('quakeDetailModal').style.display = 'block';

            const aiSummaryDiv = document.getElementById('aiSummaryContent');
            if (aiSummaryDiv) aiSummaryDiv.textContent = '加载中...';

            const quakeId = getQuakeStableKey(quake, index);
            try {
                const summary = await fetchEarthquakeSummary({
                    id: quakeId,
                    mag: Number(props.mag || 0),
                    place: placeText || originalPlace || '未知地点',
                    depth: Number(coords[2] || 0),
                    time: Number(props.time || 0),
                    lat: Number(coords[1] || 0),
                    lng: Number(coords[0] || 0)
                });
                if (aiSummaryDiv) aiSummaryDiv.innerHTML = renderAiSummary(summary);
            } catch (error) {
                console.warn('[ai-summary] failed:', error?.message || error);
                if (aiSummaryDiv) {
                    aiSummaryDiv.textContent = 'AI 科普解读生成失败，请稍后重试。';
                }
            }
        }

        function closeQuakeDetail() {
            document.getElementById('quakeDetailModal').style.display = 'none';
        }

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeQuakeDetail();
            }
        });

        // 注释
        let originalEarthquakeData = [];

        function setFilterMessage(message, type = 'info') {
            const msgDiv = document.getElementById('filterMessage');
            msgDiv.innerHTML = message;
            msgDiv.className = `filter-message ${type}`;
        }

        function clearFilterMessage() {
            document.getElementById('filterMessage').innerHTML = '';
        }

        function getFilterValues() {
            const startDate = document.getElementById('filterStartDate').value;
            const endDate = document.getElementById('filterEndDate').value;
            const minMag = parseFloat(document.getElementById('filterMinMag').value) || 0;
            const maxMag = parseFloat(document.getElementById('filterMaxMag').value) || Infinity;
            return { startDate, endDate, minMag, maxMag };
        }

        function filterEarthquakes() {
            console.log('filterEarthquakes called');
            clearFilterMessage();
            const { startDate, endDate, minMag, maxMag } = getFilterValues();
            console.log('Filter values:', { startDate, endDate, minMag, maxMag });

            if (!startDate || !endDate) {
                setFilterMessage('❌ 请输入起始日期和结束日期', 'error');
                return;
            }

            if (new Date(startDate) > new Date(endDate)) {
                setFilterMessage('❌ 起始日期不能晚于结束日期', 'error');
                return;
            }

            if (minMag > maxMag) {
                setFilterMessage('❌ 最小震级不能大于最大震级', 'error');
                return;
            }

            lastFilterParams = { startDate, endDate, minMag, maxMag };
            loadEarthquakesWithFilter(startDate, endDate, minMag, maxMag);
        }

        function rerenderByCurrentToggle() {
            applyCurrentView('已更新国内地震筛选');
        }

        function runChinaDomainRegressionChecks() {
            const cases = [
                // 注释
                { name: 'RyukyuSea', lat: 26.0, lng: 128.0, expected: false },
                { name: 'PhilippineWest', lat: 14.0, lng: 119.0, expected: false },
                { name: 'PalawanNW', lat: 10.0, lng: 118.0, expected: false },
                { name: 'VietnamEast', lat: 15.0, lng: 112.0, expected: false },
                // 注释
                { name: 'Bohai', lat: 39.2, lng: 120.5, expected: true },
                { name: 'EastChinaSeaCN', lat: 28.5, lng: 124.5, expected: true },
                { name: 'SouthChinaSeaCN', lat: 9.8, lng: 113.2, expected: true },
                { name: 'Mainland', lat: 31.2, lng: 121.5, expected: true }
            ];

            const results = cases.map(item => {
                const actual = isInChinaDomain(item.lng, item.lat);
                return {
                    case: item.name,
                    lat: item.lat,
                    lng: item.lng,
                    expected: item.expected,
                    actual,
                    pass: actual === item.expected
                };
            });

            const passCount = results.filter(r => r.pass).length;
            console.group(`[china-domain-regression] ${passCount}/${results.length} passed`);
            console.table(results);
            if (passCount !== results.length) {
                console.warn('[china-domain-regression] mismatch detected, please inspect sea polygons/exclusions.');
            }
            console.groupEnd();
        }

        function retryLastFilterLoad() {
            if (!lastFilterParams) {
                originalFetchEarthquakes();
                return;
            }
            const { startDate, endDate, minMag, maxMag } = lastFilterParams;
            loadEarthquakesWithFilter(startDate, endDate, minMag, maxMag);
        }

        function retryInitialLoad() {
            originalFetchEarthquakes();
        }

        async function loadEarthquakesWithFilter(queryStartDate, queryEndDate, queryMinMag, queryMaxMag) {
            try {
                renderTableLoading(`🔄 正在加载数据（${queryStartDate} 至 ${queryEndDate}，最小震级 M${queryMinMag}）...`);
                
                const newApiUrl = buildEarthquakeApiUrl(queryStartDate, queryEndDate, queryMinMag, queryMaxMag);
                const response = await fetch(newApiUrl);
                if (!response.ok) {
                    let errMsg = '网络请求失败';
                    try {
                        const errData = await response.json();
                        if (errData?.message) errMsg = errData.message;
                    } catch (e) {}
                    throw new Error(errMsg);
                }
                const data = await response.json();
                const filtered = data.features || [];

                if (filtered.length > 2000) {
                    setFilterMessage(`❌ 符合条件的数据过多（${filtered.length} 条 > 2000 条），请缩小筛选范围`, 'error');
                    document.getElementById('quakeList').innerHTML = `<tr><td class="table-state" colspan="${TABLE_COLSPAN}">📭 暂无数据</td></tr>`;
                    return;
                }

                if (filtered.length === 0) {
                    setFilterMessage('ℹ️ 没有符合条件的数据', 'info');
                } else {
                    setFilterMessage(`✅ 筛选成功，共 ${filtered.length} 条数据`, 'success');
                }

                originalEarthquakeData = [...filtered];
                applyCurrentView();
            } catch (error) {
                renderTableError(`加载失败：${error.message}，请检查网络连接或筛选条件`, 'retryLastFilterLoad');
                setFilterMessage(`❌ 加载失败：${error.message}`, 'error');
                console.error('获取地震数据失败:', error);
            }
        }

        function resetFilter() {
            clearFilterMessage();
            
            // 注释
            initializeFilterDates();
            originalFetchEarthquakes();
        }

        // 注释
        document.addEventListener('DOMContentLoaded', function() {
            console.log('DOM loaded, binding events');
            document.getElementById('filterApplyBtn').addEventListener('click', filterEarthquakes);
            document.getElementById('filterResetBtn').addEventListener('click', resetFilter);
            document.getElementById('domesticOnlyToggle')?.addEventListener('change', rerenderByCurrentToggle);
            bindSortControls();
            document.getElementById('quakeDetailClose').addEventListener('click', closeQuakeDetail);
            const modalEl = document.getElementById('quakeDetailModal');
            if (modalEl) {
                modalEl.addEventListener('click', function(e) {
                    if (e.target === this) closeQuakeDetail();
                });
            }
            
            // 注释
            initializeFilterDates();
            const isLocalDebugHost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
            if (isLocalDebugHost) {
                runChinaDomainRegressionChecks();
            }
            originalFetchEarthquakes();
        });

        // 注释
        const originalFetchEarthquakes = async function fetchEarthquakes() {
            try {
                renderTableLoading('🔄 正在加载地震数据...');
                const response = await fetch(apiUrl);
                if (!response.ok) {
                    let errMsg = '网络请求失败';
                    try {
                        const errData = await response.json();
                        if (errData?.message) errMsg = errData.message;
                    } catch (e) {}
                    throw new Error(errMsg);
                }
                const data = await response.json();
                originalEarthquakeData = data.features || [];
                applyCurrentView();
                const finalDisplayData = window.currentEarthquakeData || [];
                clearFilterMessage();
                setFilterMessage(`📊 已加载 ${finalDisplayData.length} 条地震数据`, 'info');
            } catch (error) {
                renderTableError(`加载失败：${error.message}，请检查网络连接`, 'retryInitialLoad');
                console.error('获取地震数据失败:', error);
            }
        };

        // 注释
        function initializeFilterDates() {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setFullYear(endDate.getFullYear() - 3);
            
            const formatDate = (date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };
            
            document.getElementById('filterStartDate').value = formatDate(startDate);
            document.getElementById('filterEndDate').value = formatDate(endDate);
            document.getElementById('filterMinMag').value = '5.5';
        }

        setInterval(originalFetchEarthquakes, 24 * 60 * 60 * 1000);
    
window.showQuakeDetail = showQuakeDetail;
window.copyPlace = copyPlace;
window.locateQuake = locateQuake;
window.retryLastFilterLoad = retryLastFilterLoad;
window.retryInitialLoad = retryInitialLoad;









