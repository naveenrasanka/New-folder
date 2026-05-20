// BUY LK Branch Locations & Map Management

const BRANCHES = [
  {
    id: 1,
    name: "Colombo Branch",
    address: "47 Janadhipathi Mawatha, Colombo 01",
    phone: "+94 (0)11 2 392 500",
    lat: 6.9271,
    lng: 80.7744,
    hours: "9:00 AM - 11:00 PM"
  },
  {
    id: 2,
    name: "Kandy Branch",
    address: "89 Peradeniya Road, Kandy",
    phone: "+94 (0)81 2 200 100",
    lat: 7.2906,
    lng: 80.6337,
    hours: "9:00 AM - 10:00 PM"
  },
  {
    id: 3,
    name: "Galle Branch",
    address: "12 Church Street, Galle",
    phone: "+94 (0)91 2 224 400",
    lat: 6.0273,
    lng: 80.2170,
    hours: "9:00 AM - 10:00 PM"
  },
  {
    id: 4,
    name: "Negombo Branch",
    address: "34 Lewis Place, Negombo",
    phone: "+94 (0)31 2 227 800",
    lat: 7.2086,
    lng: 79.8399,
    hours: "9:00 AM - 10:00 PM"
  },
  {
    id: 5,
    name: "Jaffna Branch",
    address: "56 Main Street, Jaffna",
    phone: "+94 (0)21 2 222 300",
    lat: 9.6615,
    lng: 80.7850,
    hours: "9:00 AM - 9:00 PM"
  },
  {
    id: 6,
    name: "Matara Branch",
    address: "78 Princess Street, Matara",
    phone: "+94 (0)41 2 222 100",
    lat: 5.7486,
    lng: 80.5353,
    hours: "9:00 AM - 10:00 PM"
  },
  {
    id: 7,
    name: "Batticaloa Branch",
    address: "23 Church Road, Batticaloa",
    phone: "+94 (0)65 2 222 000",
    lat: 7.7086,
    lng: 81.7708,
    hours: "9:00 AM - 9:00 PM"
  },
  {
    id: 8,
    name: "Kurunegala Branch",
    address: "45 Station Road, Kurunegala",
    phone: "+94 (0)37 2 222 900",
    lat: 7.4818,
    lng: 80.6355,
    hours: "9:00 AM - 10:00 PM"
  },
  {
    id: 9,
    name: "Anuradhapura Branch",
    address: "90 Main Street, Anuradhapura",
    phone: "+94 (0)25 2 222 500",
    lat: 8.3114,
    lng: 80.4037,
    hours: "9:00 AM - 9:00 PM"
  },
  {
    id: 10,
    name: "Trincomalee Branch",
    address: "67 Front Street, Trincomalee",
    phone: "+94 (0)26 2 222 200",
    lat: 8.5874,
    lng: 81.2372,
    hours: "9:00 AM - 9:00 PM"
  }
];

// All 25 Districts of Sri Lanka with coordinates
const DISTRICTS = [
  { name: "Ampara", lat: 7.2951, lng: 81.6756 },
  { name: "Anuradhapura", lat: 8.3114, lng: 80.4037 },
  { name: "Badulla", lat: 6.9897, lng: 81.0555 },
  { name: "Batticaloa", lat: 7.7086, lng: 81.7708 },
  { name: "Colombo", lat: 6.9271, lng: 80.7744 },
  { name: "Galle", lat: 6.0273, lng: 80.2170 },
  { name: "Gampaha", lat: 7.0914, lng: 80.4704 },
  { name: "Hambantota", lat: 6.1241, lng: 81.1208 },
  { name: "Jaffna", lat: 9.6615, lng: 80.7850 },
  { name: "Kalutara", lat: 6.5854, lng: 80.3281 },
  { name: "Kandy", lat: 7.2906, lng: 80.6337 },
  { name: "Kegalle", lat: 7.2598, lng: 80.8422 },
  { name: "Kilinochchi", lat: 9.3968, lng: 80.4315 },
  { name: "Kurunegala", lat: 7.4818, lng: 80.6355 },
  { name: "Mannar", lat: 8.9735, lng: 79.9169 },
  { name: "Matale", lat: 7.7744, lng: 80.7804 },
  { name: "Matara", lat: 5.7486, lng: 80.5353 },
  { name: "Monaragala", lat: 6.8328, lng: 81.3500 },
  { name: "Mullaitivu", lat: 8.2959, lng: 81.8205 },
  { name: "Nuwara Eliya", lat: 6.9497, lng: 80.7891 },
  { name: "Polonnaruwa", lat: 7.9375, lng: 81.0002 },
  { name: "Puttalam", lat: 8.0303, lng: 79.8293 },
  { name: "Ratnapura", lat: 6.7156, lng: 80.4050 },
  { name: "Trincomalee", lat: 8.5874, lng: 81.2372 },
  { name: "Vavuniya", lat: 8.7606, lng: 80.8030 }
];

let map = null;
let markers = [];

// Initialize map
function initializeMap() {
  // Center of Sri Lanka
  const center = [7.8731, 80.7718];
  
  // Create map
  map = L.map('map').setView(center, 8);
  
  // Add OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);
  
  // Add branch markers
  addBranchMarkers();
}

// Add markers for all branches
function addBranchMarkers() {
  // Clear existing markers
  markers.forEach(marker => map.removeLayer(marker));
  markers = [];
  
  // Add district markers first (so they appear behind branch markers)
  DISTRICTS.forEach(district => {
    const icon = L.divIcon({
      className: 'district-marker',
      html: `<div class="district-marker-icon" title="${district.name}">📌</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 24],
      popupAnchor: [0, -24]
    });
    
    const marker = L.marker([district.lat, district.lng], { icon })
      .bindPopup(`<div class="district-popup"><strong>${district.name}</strong><br><small>Delivery area</small></div>`, {
        maxWidth: 200,
        className: 'district-popup-wrapper'
      })
      .addTo(map);
    
    marker.on('click', function() {
      this.openPopup();
    });
    
    markers.push(marker);
  });
  
  // Add each branch as a marker
  BRANCHES.forEach(branch => {
    // Create custom icon
    const icon = L.divIcon({
      className: 'branch-marker',
      html: `<div class="branch-marker-icon" title="${branch.name}">📍</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });
    
    // Create marker
    const marker = L.marker([branch.lat, branch.lng], { icon })
      .bindPopup(createPopupContent(branch), { 
        maxWidth: 280,
        className: 'branch-popup-wrapper'
      })
      .addTo(map);
    
    // Add click handler to open popup
    marker.on('click', function() {
      this.openPopup();
    });
    
    markers.push(marker);
  });
}

// Create popup content for branch
function createPopupContent(branch) {
  return `
    <div class="branch-popup">
      <h4>${branch.name}</h4>
      <p>
        <span class="branch-icon">📍</span>
        ${branch.address}
      </p>
      <p>
        <span class="branch-icon">📞</span>
        <a href="tel:${branch.phone.replace(/\D/g, '')}" style="color: var(--primary); text-decoration: none;">
          ${branch.phone}
        </a>
      </p>
      <p>
        <span class="branch-icon">⏰</span>
        ${branch.hours}
      </p>
    </div>
  `;
}

// Open map modal
function openMapModal() {
  const mapModal = document.getElementById('mapModal');
  if (mapModal) {
    mapModal.classList.add('active');
    
    // Invalidate map size after modal opens (for proper rendering)
    setTimeout(() => {
      if (map) {
        map.invalidateSize();
      }
    }, 300);
  }
}

// Close map modal
function closeMapModal() {
  const mapModal = document.getElementById('mapModal');
  if (mapModal) {
    mapModal.classList.remove('active');
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
  // Initialize map when modal opens
  const checkAreaBtn = document.getElementById('checkAreaBtn');
  if (checkAreaBtn) {
    checkAreaBtn.addEventListener('click', function() {
      openMapModal();
      
      // Initialize map if not already done
      if (!map) {
        initializeMap();
      }
    });
  }
  
  // Close button
  const closeMapBtn = document.getElementById('closeMapModal');
  if (closeMapBtn) {
    closeMapBtn.addEventListener('click', closeMapModal);
  }
  
  // Close on outside click
  const mapModal = document.getElementById('mapModal');
  if (mapModal) {
    mapModal.addEventListener('click', function(e) {
      if (e.target === this) {
        closeMapModal();
      }
    });
  }
  
  // Close on Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && mapModal && mapModal.classList.contains('active')) {
      closeMapModal();
    }
  });
});
