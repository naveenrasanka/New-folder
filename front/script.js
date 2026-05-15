console.log("script.js loaded");

const products = [];

const normalizeWishlistIds = (rawWishlist) => {
  if (!Array.isArray(rawWishlist)) {
    return [];
  }

  return rawWishlist
    .map((item) => Number(item))
    .filter((id) => Number.isInteger(id) && id > 0);
};

const isValidWishlistId = (id) => Number.isInteger(Number(id)) && Number(id) > 0;

const sanitizeWishlistState = () => {
  const sanitizedIds = Array.from(state.wishlist).filter((id) => isValidWishlistId(id));

  if (sanitizedIds.length !== state.wishlist.size) {
    state.wishlist = new Set(sanitizedIds.map((id) => Number(id)));
    return true;
  }

  return false;
};

// Initialize state with localStorage support
const initializeState = () => {
  // Load cart from localStorage
  const savedCart = localStorage.getItem("buyLkCart");
  const cartData = savedCart ? JSON.parse(savedCart) : {};
  // Convert string keys back to numbers
  const cartEntries = Object.entries(cartData).map(([key, value]) => [parseInt(key), value]);
  const cart = new Map(cartEntries);
  
  // Load wishlist from localStorage
  let wishlistData = [];
  const savedWishlist = localStorage.getItem("buyLkWishlist");

  if (savedWishlist) {
    try {
      wishlistData = JSON.parse(savedWishlist);
    } catch (error) {
      console.warn("Invalid wishlist data in localStorage. Resetting wishlist.", error);
    }
  }

  const normalizedWishlist = normalizeWishlistIds(wishlistData);
  const wishlist = new Set(normalizedWishlist);

  if (savedWishlist && JSON.stringify(normalizedWishlist) !== JSON.stringify(wishlistData)) {
    localStorage.setItem("buyLkWishlist", JSON.stringify(normalizedWishlist));
  }
  
  return {
    cart: cart,
    wishlist: wishlist,
    search: "",
    category: "all",
    sort: "featured",
    theme: localStorage.getItem("theme") || "light",
    stock: 72,
    user: JSON.parse(localStorage.getItem("user") || "null"),
  };
};

const state = initializeState();

// Shipping cost variable
let globalShippingCost = 100; // Default value

// Fetch shipping cost from backend
const fetchShippingCost = async () => {
  try {
    const response = await fetch("../backend/settings/shipping.php", {
      method: "GET"
    });
    const data = await response.json();
    if (data.success) {
      globalShippingCost = parseFloat(data.shipping_cost) || 100;
      return globalShippingCost;
    }
  } catch (error) {
    console.error("Error fetching shipping cost:", error);
  }
  return globalShippingCost;
};

// Save cart to localStorage
const saveCart = () => {
  const cartObj = Object.fromEntries(state.cart);
  localStorage.setItem("buyLkCart", JSON.stringify(cartObj));
};

// Save wishlist to localStorage
const saveWishlist = () => {
  sanitizeWishlistState();
  const wishlistArray = Array.from(state.wishlist).map((id) => Number(id));
  localStorage.setItem("buyLkWishlist", JSON.stringify(wishlistArray));
};

const syncWishlistWithProducts = () => {
  if (!Array.isArray(products) || products.length === 0) {
    return;
  }

  const validProductIds = new Set(products.map((product) => Number(product.id)));
  const originalSize = state.wishlist.size;

  for (const id of Array.from(state.wishlist)) {
    if (!validProductIds.has(Number(id))) {
      state.wishlist.delete(id);
    }
  }

  if (state.wishlist.size !== originalSize) {
    sanitizeWishlistState();
    saveWishlist();
  }
};

const formatRatingStars = (rating) => {
  const safeRating = Math.max(0, Math.min(5, Number(rating) || 0));
  const fullStars = Math.round(safeRating);
  return "★".repeat(fullStars) + "☆".repeat(5 - fullStars);
};

function setupSiteReviewsSection() {
  const section = document.getElementById("siteReviewsSection");
  const form = document.getElementById("siteReviewForm");
  const reviewsList = document.getElementById("siteReviewsList");
  const averageRating = document.getElementById("siteReviewAverage");
  const averageStars = document.getElementById("siteReviewAverageStars");
  const totalReviews = document.getElementById("siteReviewTotal");
  const starInput = document.getElementById("siteReviewStarInput");
  const ratingInput = document.getElementById("siteReviewRating");
  const nameInput = document.getElementById("siteReviewName");
  const emailInput = document.getElementById("siteReviewEmail");
  const emailGroup = document.getElementById("siteReviewEmailGroup");
  const commentInput = document.getElementById("siteReviewComment");

  if (!section || !form || !reviewsList || !starInput || !ratingInput || !nameInput || !commentInput) {
    return false;
  }

  let selectedRating = 0;

  const setRating = (rating) => {
    selectedRating = Number(rating) || 0;
    ratingInput.value = selectedRating ? String(selectedRating) : "";
    starInput.querySelectorAll(".star").forEach((star) => {
      const value = Number(star.dataset.rating || 0);
      star.classList.toggle("active", value <= selectedRating);
      star.textContent = value <= selectedRating ? "★" : "☆";
    });
  };

  const renderAverage = (average) => {
    const safeAverage = Number(average) || 0;
    if (averageRating) {
      averageRating.textContent = safeAverage.toFixed(1);
    }
    if (averageStars) {
      averageStars.textContent = formatRatingStars(safeAverage);
    }
  };

  const renderSiteReviews = (reviews) => {
    if (!Array.isArray(reviews) || reviews.length === 0) {
      reviewsList.innerHTML = "<p class=\"no-reviews\">No site reviews yet. Be the first to share feedback!</p>";
      if (totalReviews) totalReviews.textContent = "0 site reviews";
      renderAverage(0);
      return;
    }

    if (totalReviews) totalReviews.textContent = `${reviews.length} site review${reviews.length === 1 ? "" : "s"}`;

    reviewsList.innerHTML = reviews
      .map((review) => {
        const date = review.created_at ? new Date(review.created_at).toLocaleDateString() : "-";
        const displayName = review.display_name || review.user_name || "Customer";
        return `
          <div class="review-item">
            <div class="review-header">
              <div>
                <div class="review-author">${displayName}</div>
                <div class="review-date">${date}</div>
              </div>
              <div class="review-rating">${formatRatingStars(review.rating || 0)}</div>
            </div>
            <p class="review-comment">${review.comment || ""}</p>
          </div>
        `;
      })
      .join("");
  };

  const loadSiteReviews = async () => {
    reviewsList.innerHTML = "<p class=\"no-reviews\">Loading site reviews...</p>";

    if (typeof getSiteReviews !== "function") {
      reviewsList.innerHTML = "<p class=\"no-reviews\">Site reviews API unavailable.</p>";
      return;
    }

    try {
      const response = await getSiteReviews();
      if (!response.success) {
        reviewsList.innerHTML = `<p class=\"no-reviews\">${response.data?.message || "Unable to load site reviews."}</p>`;
        return;
      }

      renderAverage(response.data.average_rating || 0);
      renderSiteReviews(response.data.reviews || []);
    } catch (error) {
      console.error("Failed to load site reviews", error);
      reviewsList.innerHTML = "<p class=\"no-reviews\">Error loading site reviews. Please try again.</p>";
    }
  };

  const applyUserDefaults = () => {
    const isLoggedIn = Boolean(state.user && (state.user.loggedIn || state.user.email));
    if (isLoggedIn) {
      const fallbackName = state.user.fullname || state.user.username || (state.user.email ? state.user.email.split("@")[0] : "");
      nameInput.value = fallbackName || nameInput.value;
      if (emailGroup) emailGroup.style.display = "block";
      if (emailInput) {
        emailInput.value = state.user.email || "";
        emailInput.readOnly = true;
        emailInput.disabled = true;
      }
    } else {
      if (emailGroup) emailGroup.style.display = "none";
      if (emailInput) {
        emailInput.value = "";
        emailInput.readOnly = false;
        emailInput.disabled = false;
      }
    }
  };

  applyUserDefaults();
  setRating(0);
  loadSiteReviews();

  starInput.querySelectorAll(".star").forEach((star) => {
    star.addEventListener("click", () => setRating(Number(star.dataset.rating || 0)));
    star.addEventListener("mouseenter", () => {
      const hoverRating = Number(star.dataset.rating || 0);
      starInput.querySelectorAll(".star").forEach((item) => {
        const value = Number(item.dataset.rating || 0);
        item.textContent = value <= hoverRating ? "★" : "☆";
      });
    });
  });

  starInput.addEventListener("mouseleave", () => {
    starInput.querySelectorAll(".star").forEach((item) => {
      const value = Number(item.dataset.rating || 0);
      item.textContent = value <= selectedRating ? "★" : "☆";
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const isLoggedIn = Boolean(state.user && (state.user.loggedIn || state.user.email));
    const userName = nameInput.value.trim() || (isLoggedIn ? (state.user.fullname || state.user.username || (state.user.email ? state.user.email.split("@")[0] : "")) : "");
    const comment = commentInput.value.trim();
    const rating = selectedRating;

    if (!userName || !comment || rating === 0) {
      showToast("Please fill in your name, rating, and review");
      return;
    }

    if (comment.length < 10) {
      showToast("Review must be at least 10 characters long");
      return;
    }

    if (typeof addSiteReview !== "function") {
      showToast("Site reviews API unavailable");
      return;
    }

    try {
      const userIdNumeric = Number(state.user?.id);
      const payload = {
        user_name: userName,
        rating,
        comment,
        user_id: Number.isFinite(userIdNumeric) && userIdNumeric > 0 ? userIdNumeric : null,
        user_email: isLoggedIn ? (state.user?.email || emailInput?.value?.trim() || "") : ""
      };

      const response = await addSiteReview(payload);
      if (!response.success) {
        showToast(response.data?.message || "Unable to submit site review");
        return;
      }

      form.reset();
      setRating(0);
      applyUserDefaults();
      showToast("Site review submitted successfully");
      loadSiteReviews();
    } catch (error) {
      console.error("Failed to submit site review", error);
      showToast("Error submitting site review");
    }
  });

  return true;
}

// Load products from database
async function loadProducts() {
  try {
    console.log("Starting to load products...");
    const response = await getProducts();
    console.log("API Response:", response);
    if (response.success && Array.isArray(response.data)) {
      products.length = 0; // Clear array
      // Convert string values to proper types
      const convertedProducts = response.data.map(product => ({
        ...product,
        price: parseFloat(product.price),
        rating: parseFloat(product.rating),
        stock: parseInt(product.stock)
      }));
      console.log("Converted products:", convertedProducts);
      products.push(...convertedProducts); // Add products from database
      console.log("Products array after push:", products);
      syncWishlistWithProducts();
      applyFilters(); // Render products
      renderCart(); // Re-render cart with loaded products
      updateCounts();
      console.log("applyFilters called");
    } else {
      console.error("Failed to load products: Invalid response structure");
      showToast("Failed to load products");
    }
  } catch (error) {
    console.error("Error loading products:", error);
    showToast("Error loading products");
  }
}

const productGrid = document.getElementById("productGrid");
const cartCount = document.getElementById("cartCount");
const wishlistCount = document.getElementById("wishlistCount");
const cartDrawer = document.getElementById("cartDrawer");
const cartItems = document.getElementById("cartItems");
const cartSubtotal = document.getElementById("cartSubtotal");
const cartShipping = document.getElementById("cartShipping");
const cartTotal = document.getElementById("cartTotal");
const toast = document.getElementById("toast");
const searchInput = document.getElementById("searchInput");
const searchClear = document.getElementById("searchClear");
const categoryFilter = document.getElementById("categoryFilter");
const sortFilter = document.getElementById("sortFilter");
const countdown = document.getElementById("countdown");
const stockProgress = document.getElementById("stockProgress");
const newsletterForm = document.getElementById("newsletterForm");
const newsletterMsg = document.getElementById("newsletterMsg");
const ordersModal = document.getElementById("ordersModal");
const ordersList = document.getElementById("ordersList");
const myOrdersBtn = document.getElementById("myOrdersBtn");
const closeOrdersModalBtn = document.getElementById("closeOrdersModal");
const WEB3FORMS_ACCESS_KEY = "986142cb-9e5c-4750-a459-2a2cfea13252";
let advertisements = [];
let currentAdvertisementIndex = 0;
let advertisementIntervalId = null;
const AD_ROTATION_MS = 5000;
const AD_PROGRESS_TICK_MS = 120;

const currency = {
  format: (value) => `LKR ${Number(value).toFixed(2)}`,
};

const showToast = (message) => {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2400);
};

const showStoredPaymentMessage = () => {
  try {
    const storedMessage = JSON.parse(localStorage.getItem("buyLkPaymentMessage") || "null");
    if (!storedMessage || !storedMessage.text) {
      return;
    }

    if (storedMessage.expiresAt && Date.now() > storedMessage.expiresAt) {
      localStorage.removeItem("buyLkPaymentMessage");
      return;
    }

    showToast(storedMessage.text);
    localStorage.removeItem("buyLkPaymentMessage");
  } catch (error) {
    console.warn("Unable to show stored payment message:", error);
    localStorage.removeItem("buyLkPaymentMessage");
  }
};

const setTheme = (theme) => {
  document.documentElement.dataset.theme = theme;
  state.theme = theme;
  localStorage.setItem("theme", theme);
  const toggle = document.getElementById("themeToggle");
  if (toggle) {
    toggle.textContent = theme === "dark" ? "☀️" : "🌙";
  }
};

const getOrderStatusClass = (status) => {
  const normalizedStatus = String(status || "pending").toLowerCase();
  if (normalizedStatus === "delivered") return "status-delivered";
  if (normalizedStatus === "cancelled") return "status-cancelled";
  if (normalizedStatus === "shipped") return "status-shipped";
  if (normalizedStatus === "processing") return "status-processing";
  return "status-pending";
};

const renderOrders = (orders) => {
  if (!ordersList) return;

  if (!Array.isArray(orders) || orders.length === 0) {
    ordersList.innerHTML = "<p>You have no orders yet.</p>";
    return;
  }

  console.log("Rendering orders:", orders);

  ordersList.innerHTML = orders
    .map((order) => {
      const formattedDate = order.created_at
        ? new Date(order.created_at).toLocaleString()
        : "-";
      const status = String(order.status || "pending").toLowerCase();

      // Generate items HTML
      const itemsHTML = (order.items && Array.isArray(order.items) && order.items.length > 0)
        ? `<div class="order-items-list">
             <h5 style="margin: 8px 0 6px 0; font-size: 0.9rem; font-weight: 600;">Items Ordered:</h5>
             ${order.items.map(item => `
               <div class="order-item-row" style="display: flex; justify-content: space-between; font-size: 0.85rem; padding: 4px 0; color: var(--text);">
                 <span style="flex: 1;">${item.product_name || 'Unknown Product'}</span>
                 <span style="color: var(--muted); margin: 0 8px;">×${item.quantity}</span>
                 <span style="color: var(--primary); font-weight: 600; min-width: 70px; text-align: right;">${currency.format(item.price || 0)}</span>
               </div>
             `).join('')}
           </div>`
        : `<div style="margin-top: 8px; color: var(--muted); font-size: 0.85rem;">No items found for this order.</div>`;

      return `
        <article class="order-card">
          <div class="order-card-head">
            <h4>Order #${order.id}</h4>
            <span class="order-status-badge ${getOrderStatusClass(status)}">${status}</span>
          </div>
          <p><strong>Total:</strong> ${currency.format(order.total_amount || 0)}</p>
          <p><strong>Placed:</strong> ${formattedDate}</p>
          ${itemsHTML}
        </article>
      `;
    })
    .join("");
};

const loadCustomerOrders = async () => {
  if (!ordersList) return;

  if (!state.user || !state.user.email) {
    ordersList.innerHTML = "<p>Please sign in to see your order status.</p>";
    return;
  }

  if (typeof getOrders === "undefined") {
    ordersList.innerHTML = "<p>Orders API unavailable.</p>";
    return;
  }

  ordersList.innerHTML = "<p>Loading your orders...</p>";

  try {
    console.log("Fetching orders for user:", {
      email: state.user.email,
      id: state.user.id
    });

    const response = await getOrders({
      user_email: state.user.email,
      supabase_user_id: state.user.id || ""
    });

    console.log("Orders response:", response);

    if (!response.success) {
      ordersList.innerHTML = `<p>${response.data?.message || "Unable to load orders."}</p>`;
      return;
    }

    if (!response.data || response.data.length === 0) {
      ordersList.innerHTML = "<p>You have no orders yet. Start shopping!</p>";
      return;
    }

    renderOrders(response.data);
  } catch (error) {
    console.error("Failed to load customer orders:", error);
    ordersList.innerHTML = "<p>Error loading orders. Please try again.</p>";
  }
};

const openOrdersModal = async () => {
  if (!ordersModal) return;

  ordersModal.classList.add("show");
  document.body.style.overflow = "hidden";
  await loadCustomerOrders();
};

const closeOrdersModal = () => {
  if (!ordersModal) return;
  ordersModal.classList.remove("show");
  document.body.style.overflow = "auto";
};

const applyFilters = () => {
  let filtered = [...products];

  if (state.search) {
    const keyword = state.search.toLowerCase();
    filtered = filtered.filter((product) =>
      product.name.toLowerCase().includes(keyword)
    );
  }

  if (state.category !== "all") {
    filtered = filtered.filter((product) => product.category === state.category);
  }

  if (state.sort === "price-asc") {
    filtered.sort((a, b) => a.price - b.price);
  } else if (state.sort === "price-desc") {
    filtered.sort((a, b) => b.price - a.price);
  } else if (state.sort === "rating") {
    filtered.sort((a, b) => b.rating - a.rating);
  }

  if (productGrid) {
    renderProducts(filtered);
  }
};

const renderProducts = (items) => {
  if (!productGrid) return;
  productGrid.innerHTML = items
    .map(
      (product) => `
    <article class="product-card" data-id="${product.id}">
      <span class="tag">${product.tag}</span>
      <img src="${product.image}" alt="${product.name}" />
      <h4>${product.name}</h4>
      <div class="product-meta">
        <span class="rating">★ ${product.rating}</span>
        <span class="price">${currency.format(product.price)}</span>
      </div>
      <div class="stock-status" style="font-size: 0.85rem; margin: 4px 0; font-weight: 500; color: ${product.is_available == 1 ? '#10b981' : '#ef4444'};">
            ${((product.category === 'beverages') ? (product.is_available == 1 && Number(product.stock) > 0) : (product.is_available == 1)) ? '✓ Available' : '✗ Unavailable'}
          </div>
          <div class="product-actions">
            <button class="ghost-btn" data-action="wishlist">${
              state.wishlist.has(product.id) ? "Saved" : "Wishlist"
            }</button>
            <button class="primary-btn" data-action="cart" ${((product.category === 'beverages') ? (product.is_available == 0 || Number(product.stock) <= 0) : (product.is_available == 0)) ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
              ${((product.category === 'beverages') ? (product.is_available == 1 && Number(product.stock) > 0) : (product.is_available == 1)) ? 'Add' : 'Unavailable'}
            </button>
      </div>
    </article>`
    )
    .join("");
};

const updateCounts = () => {
  if (sanitizeWishlistState()) {
    saveWishlist();
  }

  if (cartCount) {
    cartCount.textContent = [...state.cart.values()].reduce(
    (sum, qty) => sum + qty,
    0
    );
  }
  if (wishlistCount) {
    wishlistCount.textContent = state.wishlist.size;
  }
};

const renderCart = () => {
  const entries = [...state.cart.entries()];
  if (!cartItems || !cartSubtotal || !cartShipping || !cartTotal) return;

  if (entries.length === 0) {
    cartItems.innerHTML = "<p>Your cart is empty.</p>";
    cartSubtotal.textContent = currency.format(0);
    cartShipping.textContent = currency.format(0);
    cartTotal.textContent = currency.format(0);
    return;
  }

  let subtotal = 0;
  cartItems.innerHTML = entries
    .map(([id, qty]) => {
      const product = products.find((item) => {
        // Handle both string and number comparisons
        return item.id == id || item.id === parseInt(id);
      });
      
      if (!product) {
        console.warn("Product not found for cart item:", id, "Available products:", products.length);
        return "";
      }
      
      const lineTotal = product.price * qty;
      subtotal += lineTotal;
      return `
      <div class="cart-item">
        <div>
          <h5>${product.name}</h5>
          <p>${currency.format(product.price)} · ${product.tag}</p>
        </div>
        <div class="cart-item-controls">
          <button class="icon-btn" data-cart-action="decrease" data-id="${id}">-</button>
          <span>${qty}</span>
          <button class="icon-btn" data-cart-action="increase" data-id="${id}">+</button>
        </div>
      </div>
      `;
    })
    .filter(html => html !== "") // Remove empty items
    .join("");

  const shipping = globalShippingCost;
  cartSubtotal.textContent = currency.format(subtotal);
  cartShipping.textContent = currency.format(shipping);
  cartTotal.textContent = currency.format(subtotal + shipping);
};

const toggleCart = () => {
  if (!cartDrawer) return;
  cartDrawer.classList.toggle("open");
};

const updateCountdown = () => {
  const now = new Date();
  const target = new Date();
  target.setHours(now.getHours() + 2);
  const diff = target - now;
  if (diff <= 0) return;

  const hours = String(Math.floor(diff / 1000 / 60 / 60)).padStart(2, "0");
  const mins = String(Math.floor((diff / 1000 / 60) % 60)).padStart(2, "0");
  const secs = String(Math.floor((diff / 1000) % 60)).padStart(2, "0");
  if (countdown) {
    countdown.textContent = `${hours}:${mins}:${secs}`;
  }
};

const getFallbackAdvertisements = () => ([
  {
    title: "Weekend Family Combo",
    message: "Order 2 large pizzas and get a free drink combo.",
    button_text: "Order Now",
    button_link: "shop.html",
    footer_text: "Limited-time offer"
  },
  {
    title: "Bakery Fresh Hour",
    message: "Fresh buns and pastries every evening from 5 PM to 7 PM.",
    button_text: "Browse Bakery",
    button_link: "shop.html",
    footer_text: "Hot and fresh from the oven"
  },
  {
    title: "Late Night Kottu Deal",
    message: "Enjoy special prices on kottu after 9 PM.",
    button_text: "View Deal",
    button_link: "shop.html",
    footer_text: "Available tonight only"
  }
]);

const renderAdvertisement = (index) => {
  const adTitle = document.getElementById("heroAdTitle");
  const adMessage = document.getElementById("heroAdMessage");
  const adAction = document.getElementById("heroAdAction");
  const adFooter = document.getElementById("heroAdFooter");
  const adCounter = document.getElementById("heroAdCounter");

  if (!adTitle || !adMessage || !adAction || !adFooter || !adCounter || advertisements.length === 0) {
    return;
  }

  const currentAd = advertisements[index];
  adTitle.textContent = currentAd.title || "Featured Advertisement";
  adMessage.textContent = currentAd.message || "Check out the latest update.";
  adAction.textContent = currentAd.button_text || "Explore";
  adFooter.textContent = currentAd.footer_text || "More offers coming soon";
  adCounter.textContent = `${index + 1}/${advertisements.length}`;
  adAction.dataset.adLink = currentAd.button_link || "shop.html";
};

const startAdvertisementRotation = () => {
  const adAction = document.getElementById("heroAdAction");
  if (!adAction || advertisements.length === 0) return;

  renderAdvertisement(currentAdvertisementIndex);

  adAction.addEventListener("click", () => {
    const adLink = adAction.dataset.adLink || "shop.html";
    if (/^https?:\/\//i.test(adLink)) {
      window.open(adLink, "_blank", "noopener,noreferrer");
      return;
    }
    window.location.href = adLink;
  });

  if (advertisementIntervalId) {
    clearInterval(advertisementIntervalId);
  }

  const cycleDuration = advertisements.length * AD_ROTATION_MS;
  const cycleStartTime = Date.now() - currentAdvertisementIndex * AD_ROTATION_MS;

  const syncAdvertisementAndProgress = () => {
    const elapsed = Date.now() - cycleStartTime;
    const cycleElapsed = elapsed % cycleDuration;

    const nextIndex = Math.floor(cycleElapsed / AD_ROTATION_MS);
    if (nextIndex !== currentAdvertisementIndex) {
      currentAdvertisementIndex = nextIndex;
      renderAdvertisement(currentAdvertisementIndex);
    }

    if (stockProgress) {
      const progressPercent = (cycleElapsed / cycleDuration) * 100;
      stockProgress.style.width = `${progressPercent.toFixed(2)}%`;
    }
  };

  syncAdvertisementAndProgress();
  advertisementIntervalId = setInterval(syncAdvertisementAndProgress, AD_PROGRESS_TICK_MS);
};

async function loadAdvertisementsForHero() {
  const adTitle = document.getElementById("heroAdTitle");
  if (!adTitle) return;

  try {
    if (typeof getAdvertisements === "undefined") {
      advertisements = getFallbackAdvertisements();
      startAdvertisementRotation();
      return;
    }

    const response = await getAdvertisements();
    if (response.success && Array.isArray(response.data) && response.data.length > 0) {
      advertisements = response.data;
    } else {
      advertisements = getFallbackAdvertisements();
    }
  } catch (error) {
    console.error("Error loading advertisements:", error);
    advertisements = getFallbackAdvertisements();
  }

  startAdvertisementRotation();
}

if (productGrid) {
  productGrid.addEventListener("click", (event) => {
    const card = event.target.closest(".product-card");
    if (!card) return;

    const id = Number(card.dataset.id);
    
    // Handle wishlist button click
    if (event.target.dataset.action === "wishlist") {
      if (!isValidWishlistId(id)) {
        showToast("This product cannot be added to wishlist");
        return;
      }

      if (state.wishlist.has(id)) {
        state.wishlist.delete(id);
        showToast("Removed from wishlist");
      } else {
        state.wishlist.add(id);
        showToast("Saved to wishlist");
      }
      saveWishlist();
      applyFilters();
      updateCounts();
      return;
    }

    // Handle add to cart button click
    if (event.target.dataset.action === "cart") {
      // Check if product is available before adding to cart
      const product = products.find(p => p.id === id);
      if (product) {
        const isAvail = (String(product.category || '').toLowerCase() === 'beverages')
          ? (product.is_available == 1 && Number(product.stock) > 0)
          : (product.is_available == 1);
        if (!isAvail) {
          showToast("This item is currently unavailable");
          return;
        }
      }
      state.cart.set(id, (state.cart.get(id) || 0) + 1);
      saveCart();
      showToast("Added to cart");
      updateCounts();
      renderCart();
      return;
    }
    
    // If clicking anywhere else on the card, open product details modal
    if (!event.target.dataset.action) {
      if (typeof openProductModal === 'function') {
        openProductModal(id);
      }
    }
  });
}

if (cartItems) {
  cartItems.addEventListener("click", (event) => {
    const id = Number(event.target.dataset.id);
    if (!id) return;

    if (event.target.dataset.cartAction === "increase") {
      state.cart.set(id, (state.cart.get(id) || 0) + 1);
    }

    if (event.target.dataset.cartAction === "decrease") {
      const current = state.cart.get(id) || 0;
      if (current <= 1) {
        state.cart.delete(id);
      } else {
        state.cart.set(id, current - 1);
      }
    }

    saveCart();
    updateCounts();
    renderCart();
  });
}

if (searchInput) {
  searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    applyFilters();
  });
}

if (searchClear && searchInput) {
  searchClear.addEventListener("click", () => {
    searchInput.value = "";
    state.search = "";
    applyFilters();
  });
}

if (categoryFilter) {
  categoryFilter.addEventListener("change", (event) => {
    state.category = event.target.value;
    applyFilters();
  });
}

if (sortFilter) {
  sortFilter.addEventListener("change", (event) => {
    state.sort = event.target.value;
    applyFilters();
  });
}

Array.from(document.querySelectorAll(".category-grid button")).forEach((btn) => {
  btn.addEventListener("click", () => {
    state.category = btn.dataset.category;
    if (categoryFilter) {
      categoryFilter.value = state.category;
    }
    applyFilters();
  });
});

// Newsletter form handler - Main form
if (newsletterForm) {
  newsletterForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("newsletterEmail")?.value.trim();
    
    if (!email) {
      if (newsletterMsg) {
        newsletterMsg.textContent = "Please enter your email.";
        newsletterMsg.style.color = "#ef4444";
      }
      return;
    }

    if (!email.includes("@")) {
      if (newsletterMsg) {
        newsletterMsg.textContent = "Please enter a valid email.";
        newsletterMsg.style.color = "#ef4444";
      }
      return;
    }

    try {
      // Try simpler path first
      let response = await fetch("../backend/subscribe.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email: email })
      });
      
      // If that fails, try the longer path
      if (!response.ok) {
        response = await fetch("../backend/products/subscription.php", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email: email })
        });
      }
      
      // Check if response is ok
      if (!response.ok) {
        console.error("API Error:", response.status, response.statusText);
        if (newsletterMsg) {
          newsletterMsg.textContent = "❌ Server error (Status: " + response.status + ")";
          newsletterMsg.style.color = "#ef4444";
        }
        return;
      }
      
      // Get response text first to debug
      const responseText = await response.text();
      console.log("API Response:", responseText);
      
      // Try to parse JSON
      if (!responseText) {
        if (newsletterMsg) {
          newsletterMsg.textContent = "❌ Empty response. Run: backend/setup-database.php";
          newsletterMsg.style.color = "#ef4444";
        }
        return;
      }
      
      let subscriptionData;
      try {
        subscriptionData = JSON.parse(responseText);
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
        console.error("Response was:", responseText.substring(0, 500));
        if (newsletterMsg) {
          newsletterMsg.textContent = "❌ Invalid response format";
          newsletterMsg.style.color = "#ef4444";
        }
        return;
      }
      
      if (subscriptionData.success) {
        if (newsletterMsg) {
          newsletterMsg.textContent = subscriptionData.message || "✅ Successfully subscribed! You'll receive emails about new products.";
          newsletterMsg.style.color = "#10b981";
        }
        newsletterForm.reset();
      } else {
        if (newsletterMsg) {
          newsletterMsg.textContent = subscriptionData.message || "Subscription failed. Please try again.";
          newsletterMsg.style.color = "#ef4444";
        }
      }
    } catch (error) {
      console.error("Newsletter subscription error:", error);
      if (newsletterMsg) {
        newsletterMsg.textContent = "❌ Error: " + error.message;
        newsletterMsg.style.color = "#ef4444";
      }
    }
  });
}

// Newsletter form handler - Footer form
const footerNewsletterForm = document.getElementById("footerNewsletterForm");
if (footerNewsletterForm) {
  footerNewsletterForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = footerNewsletterForm.querySelector("input[type='email']")?.value.trim();
    
    if (!email) {
      alert("Please enter your email.");
      return;
    }

    if (!email.includes("@")) {
      alert("Please enter a valid email.");
      return;
    }

    try {
      // Try simpler path first
      let response = await fetch("../backend/subscribe.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email: email })
      });
      
      // If that fails, try the longer path
      if (!response.ok) {
        response = await fetch("../backend/products/subscription.php", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email: email })
        });
      }
      
      // Check if response is ok
      if (!response.ok) {
        console.error("API Error:", response.status, response.statusText);
        alert("❌ Server error. Status: " + response.status);
        return;
      }
      
      // Get response text first to debug
      const responseText = await response.text();
      console.log("API Response:", responseText);
      
      // Try to parse JSON
      if (!responseText) {
        alert("❌ Empty response from server. Check if database table exists. Go to: ../backend/setup-database.php");
        return;
      }
      
      let subscriptionData;
      try {
        subscriptionData = JSON.parse(responseText);
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
        console.error("Response was:", responseText.substring(0, 500));
        alert("❌ Invalid response format. Response: " + responseText.substring(0, 100));
        return;
      }
      
      if (subscriptionData.success) {
        alert("✅ " + (subscriptionData.message || "Successfully subscribed! You'll receive emails about new products."));
        footerNewsletterForm.reset();
      } else {
        alert("❌ " + (subscriptionData.message || "Subscription failed. Please try again."));
      }
    } catch (error) {
      console.error("Newsletter subscription error:", error);
      alert("❌ Error: " + error.message);
    }
  });
}

// Contact form handler
const contactForm = document.getElementById("contactForm");
if (contactForm) {
  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = document.getElementById("contactName")?.value.trim();
    const email = document.getElementById("contactEmail")?.value.trim();
    const subject = document.getElementById("contactSubject")?.value.trim() || "Contact Form";
    const message = document.getElementById("contactMessage")?.value.trim();
    const contactMsg = document.getElementById("contactMsg");

    if (!name || !email || !message) {
      if (contactMsg) {
        contactMsg.textContent = "Please fill in all required fields.";
        contactMsg.style.color = "#ef4444";
      }
      return;
    }

    if (!email.includes("@")) {
      if (contactMsg) {
        contactMsg.textContent = "Please enter a valid email address.";
        contactMsg.style.color = "#ef4444";
      }
      return;
    }

    // Show loading state
    const submitBtn = contactForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Sending...";
    submitBtn.disabled = true;

    try {
      const web3formsPayload = {
        access_key: WEB3FORMS_ACCESS_KEY,
        name,
        email,
        subject,
        message,
      };

      const web3formsResponse = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(web3formsPayload),
      });

      const web3formsResult = await web3formsResponse.json();

      if (web3formsResult.success) {
        // Keep existing backend contact storage as a non-blocking secondary action.
        if (typeof submitContact !== "undefined") {
          try {
            await submitContact(name, email, subject, message);
          } catch (storeError) {
            console.warn("Contact saved email sent, but backend save failed:", storeError);
          }
        }

        if (contactMsg) {
          contactMsg.textContent = "Message sent successfully!";
          contactMsg.style.color = "#10b981";
        }
        alert("Message sent successfully!");
        contactForm.reset();
      } else {
        if (contactMsg) {
          contactMsg.textContent = web3formsResult.message || "Failed to send message. Please try again.";
          contactMsg.style.color = "#ef4444";
        }
      }
    } catch (error) {
      console.error("Contact form error:", error);
      if (contactMsg) {
        contactMsg.textContent = "An error occurred. Please try again.";
        contactMsg.style.color = "#ef4444";
      }
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
}

const cartBtn = document.getElementById("cartBtn");
if (cartBtn) {
  cartBtn.addEventListener("click", toggleCart);
}

const closeCart = document.getElementById("closeCart");
if (closeCart) {
  closeCart.addEventListener("click", toggleCart);
}

const menuToggle = document.getElementById("menuToggle");
if (menuToggle) {
  menuToggle.addEventListener("click", () => {
    menuToggle.classList.toggle("active");
    document.body.classList.toggle("mobile-menu-open");
  });

  const navLinks = document.querySelectorAll(".nav a");
  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      menuToggle.classList.remove("active");
      document.body.classList.remove("mobile-menu-open");
    });
  });
}

const themeToggle = document.getElementById("themeToggle");
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    setTheme(state.theme === "light" ? "dark" : "light");
  });
}

const shopNow = document.getElementById("shopNow");
if (shopNow) {
  shopNow.addEventListener("click", () => {
    const featured = document.getElementById("featured");
    if (featured) {
      featured.scrollIntoView({ behavior: "smooth" });
    }
  });
}

const viewCollections = document.getElementById("viewCollections");
if (viewCollections) {
  viewCollections.addEventListener("click", () => {
    const categories = document.getElementById("categories");
    if (categories) {
      categories.scrollIntoView({ behavior: "smooth" });
    }
  });
}

// ===== WISHLIST MODAL SYSTEM =====
function setupWishlistSystem() {
  console.log("Setting up wishlist system...");
  
  const wishlistModal = document.getElementById("wishlistModal");
  const closeWishlistBtn = document.getElementById("closeWishlist");
  const wishlistItemsContainer = document.getElementById("wishlistItems");
  const wishlistBtn = document.getElementById("wishlistBtn");
  
  if (!wishlistModal) {
    console.error("Wishlist modal not found");
    return false;
  }
  
  // Open wishlist modal
  function openWishlist() {
    console.log("Opening wishlist");
    renderWishlist();
    wishlistModal.classList.add("show");
    document.body.style.overflow = "hidden";
  }
  
  // Close wishlist modal
  function closeWishlist() {
    console.log("Closing wishlist");
    wishlistModal.classList.remove("show");
    document.body.style.overflow = "auto";
  }
  
  // Render wishlist items
  function renderWishlist() {
    if (!wishlistItemsContainer) return;
    
    const wishlistItems = Array.from(state.wishlist).filter((id) =>
      isValidWishlistId(id) && products.some((product) => Number(product.id) === Number(id))
    );

    if (wishlistItems.length !== state.wishlist.size) {
      state.wishlist = new Set(wishlistItems);
      saveWishlist();
      updateCounts();
    }
    
    if (wishlistItems.length === 0) {
      wishlistItemsContainer.innerHTML = `
        <div class="empty-wishlist">
          <p>Your wishlist is empty. Start saving your favorites!</p>
        </div>
      `;
      return;
    }
    
    wishlistItemsContainer.innerHTML = wishlistItems
      .map(id => {
        const product = products.find(p => p.id == id);
        if (!product) return "";
        const imageSrc = product.image || "https://via.placeholder.com/100?text=BUY+LK";
        
        return `
          <div class="wishlist-item">
            <img src="${imageSrc}" alt="${product.name}" onerror="this.onerror=null;this.src='https://via.placeholder.com/100?text=BUY+LK';" />
            <div class="wishlist-item-info">
              <h4>${product.name}</h4>
              <p>${product.tag}</p>
              <div class="wishlist-item-price">${currency.format(product.price)}</div>
              <div class="wishlist-item-actions">
                <button class="add-to-cart-btn" data-add-to-cart="${id}">Add to Cart</button>
                <button class="remove-wishlist-btn" data-remove-wishlist="${id}">Remove</button>
              </div>
            </div>
          </div>
        `;
      })
      .join("");
    
    // Add event listeners for action buttons
    wishlistItemsContainer.querySelectorAll("[data-add-to-cart]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = parseInt(e.target.dataset.addToCart);
        state.cart.set(id, (state.cart.get(id) || 0) + 1);
        saveCart();
        updateCounts();
        renderCart();
        showToast("Added to cart");
      });
    });
    
    wishlistItemsContainer.querySelectorAll("[data-remove-wishlist]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = parseInt(e.target.dataset.removeWishlist);
        if (!isValidWishlistId(id)) {
          return;
        }
        state.wishlist.delete(id);
        saveWishlist();
        updateCounts();
        renderWishlist();
        showToast("Removed from wishlist");
      });
    });
  }
  
  // Wishlist button click
  if (wishlistBtn) {
    wishlistBtn.addEventListener("click", openWishlist);
    console.log("Wishlist button listener added");
  }
  
  // Close button click
  if (closeWishlistBtn) {
    closeWishlistBtn.addEventListener("click", closeWishlist);
  }
  
  // Close on background click
  wishlistModal.addEventListener("click", (e) => {
    if (e.target === wishlistModal) {
      closeWishlist();
    }
  });
  
  console.log("Wishlist system setup complete");
  return true;
}

// ===== PAYMENT MODAL SYSTEM =====
function setupPaymentSystem() {
  console.log("Setting up payment system...");
  
  const paymentModal = document.getElementById("paymentModal");
  const closePaymentBtn = document.getElementById("closePayment");
  const paymentForm = document.getElementById("paymentForm");
  const checkoutBtn = document.getElementById("checkoutBtn");
  
  if (!paymentModal) {
    console.error("Payment modal element not found");
    return false;
  }
  
  // Open payment modal
  function openPayment() {
    console.log("Opening payment modal");
    if (state.cart.size === 0) {
      showToast("Your cart is empty");
      return;
    }
    
    // Calculate totals
    let subtotal = 0;
    state.cart.forEach((qty, productId) => {
      const product = products.find(p => p.id == productId);
      if (product) {
        subtotal += product.price * qty;
      }
    });
    
    const shipping = globalShippingCost;
    const total = subtotal + shipping;
    
    // Update amounts
    document.getElementById("paymentSubtotal").textContent = currency.format(subtotal);
    document.getElementById("paymentShipping").textContent = currency.format(shipping);
    document.getElementById("paymentTotal").textContent = currency.format(total);
    
    // Show modal
    paymentModal.classList.add("show");
    document.body.style.overflow = "hidden";
    console.log("Payment modal is now visible");
  }
  
  // Close payment modal
  function closePayment() {
    console.log("Closing payment modal");
    paymentModal.classList.remove("show");
    document.body.style.overflow = "auto";
  }
  
  // Checkout button click
  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", openPayment);
    console.log("Checkout button listener added");
  }
  
  // Close button click
  if (closePaymentBtn) {
    closePaymentBtn.addEventListener("click", closePayment);
  }
  
  // Close on background click
  paymentModal.addEventListener("click", (e) => {
    if (e.target === paymentModal) {
      closePayment();
    }
  });
  
  // Form submission
  if (paymentForm) {
    paymentForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      console.log("Payment form submitted");

      if (!paymentForm.checkValidity()) {
        paymentForm.reportValidity();
        showToast("Please complete all billing information and accept the terms");
        return;
      }
      
      const submitBtn = paymentForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      
      submitBtn.textContent = "Redirecting...";
      submitBtn.disabled = true;
      
      try {
        const billingInputs = paymentForm.querySelectorAll(
          'input:not([type="checkbox"]):not([type="submit"])'
        );
        const firstName = billingInputs[0]?.value.trim() || "";
        const lastName = billingInputs[1]?.value.trim() || "";
        const email = billingInputs[2]?.value.trim() || state.user?.email || "";
        const streetAddress = billingInputs[3]?.value.trim() || "";
        const city = billingInputs[4]?.value.trim() || "";
        const postalCode = billingInputs[5]?.value.trim() || "";
        const phone = billingInputs[6]?.value.trim() || "";

        const cartItemsForCheckout = [];
        state.cart.forEach((quantity, productId) => {
          const product = products.find((item) => item.id == productId);
          if (!product) {
            return;
          }

          cartItemsForCheckout.push({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity,
            image: product.image || "",
          });
        });

        if (cartItemsForCheckout.length === 0) {
          throw new Error("Your cart is empty.");
        }

        const subtotal = cartItemsForCheckout.reduce(
          (sum, item) => sum + Number(item.price) * Number(item.quantity),
          0
        );
        const shipping = globalShippingCost;
        const selectedPaymentMethod = paymentForm.querySelector('input[name="paymentMethod"]:checked')?.value || "credit_card";
        const isCashOnDelivery = selectedPaymentMethod === "cash_on_delivery";
        const paymentStatus = isCashOnDelivery ? "pending" : "paid";

        const checkoutPayload = {
          cartItems: cartItemsForCheckout,
          subtotal,
          shipping,
          total: subtotal + shipping,
          email,
          payment_method: selectedPaymentMethod,
          billingDetails: {
            firstName,
            lastName,
            streetAddress,
            city,
            postalCode,
            phone,
          },
        };

        const userIdNumeric = Number(state.user?.id);
        const pendingOrderData = {
          user_id: Number.isFinite(userIdNumeric) && userIdNumeric > 0 ? userIdNumeric : null,
          supabase_user_id: state.user?.id && !Number.isFinite(userIdNumeric) ? String(state.user.id) : "",
          user_email: email,
          customer_name: `${firstName} ${lastName}`.trim(),
          customer_phone: phone,
          customer_address: streetAddress,
          payment_method: selectedPaymentMethod,
          payment_status: paymentStatus,
          total_amount: subtotal + shipping,
          items: cartItemsForCheckout.map((item) => ({
            product_id: Number(item.id),
            quantity: Number(item.quantity),
            price: Number(item.price)
          }))
        };

        localStorage.setItem("buyLkPendingOrder", JSON.stringify(pendingOrderData));

        if (isCashOnDelivery) {
          const orderResponse = await createOrder(pendingOrderData);

          if (!orderResponse.success || !orderResponse.data?.success) {
            throw new Error(orderResponse.data?.message || "Failed to place cash on delivery order.");
          }

          const orderId = orderResponse.data.order_id || orderResponse.data?.data?.order_id || null;
          localStorage.removeItem("buyLkPendingOrder");
          localStorage.removeItem("buyLkCart");
          window.dispatchEvent(new Event("storage"));
          if (typeof renderCart === "function") {
            renderCart();
          }
          updateCounts();
          paymentModal.classList.remove("show");
          document.body.style.overflow = "auto";
          localStorage.setItem(
            "buyLkPaymentMessage",
            JSON.stringify({
              text: orderId ? `Order #${orderId} placed for cash on delivery.` : "Cash on delivery order placed successfully.",
              expiresAt: Date.now() + 60000,
            })
          );
          showToast(orderId ? `Order #${orderId} placed for cash on delivery` : "Cash on delivery order placed successfully");
          window.location.href = state.user?.email ? "account.html" : "index.html";
          return;
        }

        const checkoutEndpoint =
          (typeof API_ENDPOINTS !== "undefined" &&
            API_ENDPOINTS.payments &&
            API_ENDPOINTS.payments.createCheckout) ||
          "../backend/payments/create-checkout.php";

        const response = await phpApiCall(
          checkoutEndpoint,
          "POST",
          checkoutPayload
        );

        if (!response.success || !response.data?.success) {
          throw new Error(response.data?.message || "Failed to start checkout.");
        }

        const checkoutUrl = response.data.sessionUrl;
        if (!checkoutUrl) {
          throw new Error("Stripe checkout URL was not returned.");
        }

        window.location.href = checkoutUrl;
      } catch (error) {
        console.error("Payment error:", error);
        showToast(error.message || "Payment setup failed");
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });
  }
  
  console.log("Payment system setup complete");
  return true;
}

// Setup on document ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setupPaymentSystem();
    setupWishlistSystem();
    setupSiteReviewsSection();
  });
} else {
  setupPaymentSystem();
  setupWishlistSystem();
  setupSiteReviewsSection();
}

// Counter Animation Function
const animateCounters = () => {
  const heroStats = document.querySelectorAll('.hero-stats > div');
  
  if (heroStats.length === 0) return;
  
  const statsData = [
    { target: 4.8, duration: 2000, format: (val) => val.toFixed(1) },
    { target: 120000, duration: 2500, format: (val) => {
      if (val >= 1000) {
        return (val / 1000).toFixed(0) + 'k+';
      }
      return val.toLocaleString();
    }},
    { target: null, duration: 0, format: (val) => 'Fast' }
  ];
  
  heroStats.forEach((stat, index) => {
    const strong = stat.querySelector('strong');
    if (!strong || !statsData[index]) return;
    
    const data = statsData[index];
    
    // For "Fast" text, just show it
    if (data.target === null) {
      strong.textContent = 'Fast';
      return;
    }
    
    const startValue = 0;
    const targetValue = data.target;
    const duration = data.duration;
    const startTime = Date.now();
    
    const updateCounter = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuad = 1 - (1 - progress) * (1 - progress);
      const currentValue = startValue + (targetValue - startValue) * easeOutQuad;
      
      strong.textContent = data.format(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      }
    };
    
    updateCounter();
  });
};

setTheme(state.theme);
loadProducts(); // Load products from database (includes renderCart)
fetchShippingCost(); // Load shipping cost from backend
loadAdvertisementsForHero();
updateCounts();
updateCountdown();
showStoredPaymentMessage();

// Start counter animation after a short delay
setTimeout(animateCounters, 300);

setInterval(updateCountdown, 1000);

// Authentication UI update
const updateAuthUI = () => {
  const authLinks = document.getElementById("authLinks");
  const userMenu = document.getElementById("userMenu");
  const userBtn = document.getElementById("userBtn");
  const showCustomerActions = state.user && (state.user.loggedIn || state.user.email);

  if (showCustomerActions) {
    if (authLinks) authLinks.style.display = "none";
    if (userMenu) userMenu.style.display = "flex";
    if (userBtn) {
      const emailPart = state.user.email ? state.user.email.split("@")[0] : "Account";
      const userName = state.user.fullname || emailPart;
      userBtn.textContent = `👤 ${userName}`;
    }
  } else {
    if (authLinks) authLinks.style.display = "flex";
    if (userMenu) userMenu.style.display = "none";
  }
};

const userBtnEl = document.getElementById("userBtn");
if (userBtnEl) {
  userBtnEl.addEventListener("click", () => {
    if (!state.user || (!state.user.loggedIn && !state.user.email)) {
      window.location.href = "login.html";
      return;
    }

    if (!window.location.pathname.toLowerCase().includes("account.html")) {
      window.location.href = "account.html";
    }
  });
}

if (myOrdersBtn) {
  myOrdersBtn.addEventListener("click", () => {
    if (!state.user || !state.user.loggedIn) {
      showToast("Please sign in to view your orders");
      return;
    }

    openOrdersModal();
  });
}

if (closeOrdersModalBtn) {
  closeOrdersModalBtn.addEventListener("click", closeOrdersModal);
}

if (ordersModal) {
  ordersModal.addEventListener("click", (event) => {
    if (event.target === ordersModal) {
      closeOrdersModal();
    }
  });
}

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      // Call logout API if available
      if (typeof logoutUser !== "undefined") {
        await logoutUser();
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
    
    // Clear local storage and update UI
    localStorage.removeItem("user");
    localStorage.removeItem("buyLkCart");
    localStorage.removeItem("buyLkWishlist");
    if (typeof state !== "undefined") {
      state.user = null;
      if (Array.isArray(state.cart)) {
        state.cart = [];
      }
      if (state.wishlist instanceof Set) {
        state.wishlist.clear();
      } else {
        state.wishlist = new Set();
      }
    }
    window.dispatchEvent(new Event("storage"));
    updateAuthUI();
    if (typeof updateCounts === "function") {
      updateCounts();
    }
    showToast("Logged out successfully");
    setTimeout(() => {
      window.location.href = "index.html";
    }, 1000);
  });
}

updateAuthUI();

const initChatbot = () => {
  if (!document.body || document.getElementById("chatbotFab")) {
    return;
  }

  const panel = document.createElement("div");
  panel.className = "chatbot-panel";
  panel.id = "chatbotPanel";
  panel.innerHTML = `
    <div class="chatbot-header">
      <span class="chatbot-title">BUY LK Assistant</span>
      <button class="icon-btn" id="chatbotClose" aria-label="Close chat">✕</button>
    </div>
    <div class="chatbot-messages" id="chatbotMessages"></div>
    <div class="chatbot-input">
      <input type="text" id="chatbotInput" placeholder="Ask about orders, menu, or delivery..." />
      <button id="chatbotSend">Send</button>
    </div>
  `;

  const fab = document.createElement("button");
  fab.className = "chatbot-fab";
  fab.id = "chatbotFab";
  fab.setAttribute("aria-label", "Open chat");
  fab.innerHTML = '<i class="ri-chat-3-line" aria-hidden="true"></i>';

  document.body.appendChild(panel);
  document.body.appendChild(fab);

  const messagesEl = document.getElementById("chatbotMessages");
  const inputEl = document.getElementById("chatbotInput");
  const sendBtn = document.getElementById("chatbotSend");
  const closeBtn = document.getElementById("chatbotClose");

  const systemPrompt =
    "You are BUY LK Assistant. Use only the DATA provided. If the answer is not in DATA, say you do not have that information and suggest how to find it. Keep answers short and friendly.";

  const buildChatContext = async () => {
    const context = {
      user: {
        signedIn: Boolean(state.user && state.user.loggedIn),
        email: state.user?.email || "",
        id: state.user?.id || ""
      },
      products: [],
      orders: [],
      notes: []
    };

    let productList = Array.isArray(products) ? products : [];

    if (productList.length === 0 && typeof getProducts === "function") {
      try {
        const response = await getProducts();
        if (response.success && Array.isArray(response.data)) {
          productList = response.data;
        }
      } catch (error) {
        context.notes.push("Unable to refresh products.");
      }
    }

    if (productList.length > 0) {
      const limit = 60;
      const trimmed = productList.slice(0, limit).map((product) => {
        const stock = Number(product.stock ?? 0);
        const isAvailable = String(product.category || '').toLowerCase() === 'beverages'
          ? (Boolean(Number(product.is_available)) && stock > 0)
          : Boolean(Number(product.is_available));
        return {
          id: Number(product.id),
          name: String(product.name || ""),
          category: String(product.category || ""),
          price: Number(product.price || 0),
          available: isAvailable,
          stock
        };
      });

      context.products = trimmed;

      if (productList.length > limit) {
        context.notes.push(`Products list truncated to ${limit} items.`);
      }
    } else {
      context.notes.push("No product data available.");
    }

    if (context.user.signedIn && typeof getOrders === "function") {
      try {
        const userIdNumeric = Number(state.user?.id);
        const filters = {
          user_id: Number.isFinite(userIdNumeric) && userIdNumeric > 0 ? userIdNumeric : null,
          supabase_user_id:
            state.user?.id && !Number.isFinite(userIdNumeric) ? String(state.user.id) : "",
          user_email: state.user?.email || ""
        };

        const response = await getOrders(filters);
        if (response.success && Array.isArray(response.data)) {
          context.orders = response.data.slice(0, 5).map((order) => ({
            id: Number(order.id),
            status: String(order.status || "pending"),
            total_amount: Number(order.total_amount || 0),
            created_at: String(order.created_at || ""),
            items: Array.isArray(order.items)
              ? order.items.map((item) => ({
                  name: String(item.product_name || ""),
                  quantity: Number(item.quantity || 0),
                  price: Number(item.price || 0)
                }))
              : []
          }));
        }
      } catch (error) {
        context.notes.push("Unable to load order history.");
      }
    } else if (!context.user.signedIn) {
      context.notes.push("User is not signed in; order history not available.");
    }

    return context;
  };

  const historyKey = "buyLkChatHistory";
  const history = JSON.parse(localStorage.getItem(historyKey) || "[]");

  const renderMessage = (role, content) => {
    const bubble = document.createElement("div");
    bubble.className = `chatbot-message ${role}`;
    bubble.textContent = content;
    messagesEl.appendChild(bubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  if (history.length === 0) {
    renderMessage("bot", "Hi! Ask me about menu items, orders, or delivery.");
  } else {
    history.forEach((item) => renderMessage(item.role, item.content));
  }

  const saveHistory = (role, content) => {
    history.push({ role, content });
    const trimmed = history.slice(-12);
    localStorage.setItem(historyKey, JSON.stringify(trimmed));
  };

  const sendMessage = async () => {
    const message = inputEl.value.trim();
    if (!message) return;

    renderMessage("user", message);
    saveHistory("user", message);
    inputEl.value = "";

    const typing = document.createElement("div");
    typing.className = "chatbot-typing";
    typing.textContent = "Assistant is typing...";
    messagesEl.appendChild(typing);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    try {
      if (!window.puter || !puter.ai || !puter.ai.chat) {
        typing.remove();
        renderMessage("bot", "Puter AI is not available. Please refresh the page.");
        return;
      }

      const historyText = history
        .slice(-8)
        .map((item) => `${item.role === "user" ? "User" : "Assistant"}: ${item.content}`)
        .join("\n");

      const context = await buildChatContext();
      const prompt = `${systemPrompt}\n\nDATA:${JSON.stringify(context)}\n\nConversation:\n${historyText}\nUser: ${message}\nAssistant:`;

      const response = await puter.ai.chat(prompt, {
        model: "x-ai/grok-4-1-fast",
      });

      typing.remove();

      const reply = response?.message?.content || response?.text || "";
      if (!reply) {
        renderMessage("bot", "Sorry, I could not reply right now.");
        return;
      }

      renderMessage("bot", reply);
      saveHistory("bot", reply);
    } catch (error) {
      typing.remove();
      renderMessage("bot", "Chat error. Please try again.");
    }
  };

  fab.addEventListener("click", () => {
    panel.classList.toggle("open");
    if (panel.classList.contains("open")) {
      inputEl.focus();
    }
  });

  closeBtn.addEventListener("click", () => {
    panel.classList.remove("open");
  });

  sendBtn.addEventListener("click", sendMessage);
  inputEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      sendMessage();
    }
  });
};

if (document.body) {
  initChatbot();
} else {
  window.addEventListener("DOMContentLoaded", initChatbot);
}
