const waypoints = [
    { lat: 53.2886, lng: -3.0059, label: "A", name: "Hadlow Road Railway Station", desc: "Start: Historic station on the Wirral Way, Willaston", type: "start" },
    { lat: 53.3207, lng: -3.0457, label: "2", name: "Willaston South", desc: "Waypoint along PROW heading north", type: "waypoint" },
    { lat: 53.3625, lng: -3.0820, label: "3", name: "Landican", desc: "Landican village", type: "waypoint" },
    { lat: 53.3680, lng: -3.1015, label: "4", name: "Arrowe Park Area", desc: "Near Arrowe Park", type: "waypoint" },
    { lat: 53.4034, lng: -3.1382, label: "5", name: "Thurstaston Area", desc: "Near Thurstaston Hill", type: "waypoint" },
    { lat: 53.4076, lng: -3.1533, label: "6", name: "Irby / Pensby", desc: "Western section of route", type: "waypoint" },
    { lat: 53.4161, lng: -3.1199, label: "B", name: "End Point", desc: "Route end near Storeton / Higher Bebington", type: "end" }
];

function createMarkerIcon(type, label) {
    const typeClass = {
        start: 'marker-start',
        end: 'marker-end',
        poi: 'marker-poi',
        waypoint: 'marker-waypoint'
    }[type] || 'marker-waypoint';

    return L.divIcon({
        className: 'custom-marker',
        html: `<div class="marker-pin ${typeClass}">${label}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -16]
    });
}

const map = L.map('map').setView([53.355, -3.085], 12);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | PROW data: Wirral &amp; Cheshire West councils via <a href="https://www.rowmaps.com">rowmaps.com</a>, <a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/">OGL</a>. Contains OS data &copy; Crown copyright.',
    maxZoom: 18
}).addTo(map);

fetch('results/complete_v1.json')
    .then(r => r.json())
    .then(routePath => {
        const routeLine = L.polyline(routePath, {
            color: '#1976D2',
            weight: 4,
            opacity: 0.85,
            lineCap: 'round',
            lineJoin: 'round'
        }).addTo(map);

        map.fitBounds(routeLine.getBounds().pad(0.1));
    });

waypoints.forEach(wp => {
    const marker = L.marker([wp.lat, wp.lng], {
        icon: createMarkerIcon(wp.type, wp.label)
    }).addTo(map);
    marker.bindPopup(`<strong>${wp.name}</strong><br>${wp.desc}`);
});

const legend = L.control({ position: 'bottomleft' });
legend.onAdd = function() {
    const div = L.DomUtil.create('div', 'route-info');
    div.style.position = 'static';
    div.style.padding = '10px';
    div.style.fontSize = '12px';
    div.innerHTML = `
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <div style="width:14px;height:14px;border-radius:50%;background:#4CAF50"></div> Start
        </div>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <div style="width:14px;height:14px;border-radius:50%;background:#FF9800"></div> Point of Interest
        </div>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <div style="width:14px;height:14px;border-radius:50%;background:#2196F3"></div> Waypoint
        </div>
        <div style="display:flex;align-items:center;gap:6px">
            <div style="width:14px;height:14px;border-radius:50%;background:#f44336"></div> End
        </div>
    `;
    return div;
};
legend.addTo(map);
