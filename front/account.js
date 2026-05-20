(() => {
  console.log("account.js loaded");

  const accountContent = document.getElementById("accountContent");
  const accountGate = document.getElementById("accountGate");
  const profileForm = document.getElementById("profileForm");
  const profileReset = document.getElementById("profileReset");
  const profileName = document.getElementById("profileName");
  const profileEmail = document.getElementById("profileEmail");
  const profilePhone = document.getElementById("profilePhone");
  const profileAddress = document.getElementById("profileAddress");
  const profileDistrict = document.getElementById("profileDistrict");
  const profilePostalCode = document.getElementById("profilePostalCode");
  const accountGreeting = document.getElementById("accountGreeting");
  const ordersList = document.getElementById("accountOrdersList");
  const reviewsList = document.getElementById("accountReviewsList");
  const orderCount = document.getElementById("accountOrderCount");
  const reviewCount = document.getElementById("accountReviewCount");
  const savedCount = document.getElementById("accountSavedCount");
  const myOrdersBtn = document.getElementById("myOrdersBtn");

  let profileSyncToken = 0;
  let lastProfileSaveAt = 0;

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch (error) {
    console.warn("Unable to parse stored user", error);
    return null;
  }
};

const normalizeStoredUser = (user) => {
  if (!user) return null;

  if (!user.loggedIn && user.email) {
    const updated = { ...user, loggedIn: true };
    localStorage.setItem("user", JSON.stringify(updated));
    return updated;
  }

  return user;
};

const showToast = (message) => {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2400);
};

const getUserKey = (user) => {
  if (!user) return "";
  return user.email || user.id || user.username || "";
};

const updateLocalUser = (updates) => {
  const current = getStoredUser();
  if (!current) return null;

  const updated = { ...current, ...updates };
  localStorage.setItem("user", JSON.stringify(updated));

  if (typeof state !== "undefined") {
    state.user = updated;
  }

  if (typeof updateAuthUI === "function") {
    updateAuthUI();
  }

  return updated;
};

const fillProfileForm = (user) => {
  if (!profileName || !profileEmail) return;
  const fallbackName = user?.fullname || user?.username || (user?.email ? user.email.split("@")[0] : "");

  profileName.value = fallbackName || "";
  profileEmail.value = user?.email || "";
  profilePhone.value = user?.phone || "";
  profileAddress.value = user?.address || "";
  if (profileDistrict) profileDistrict.value = user?.district || "";
  if (profilePostalCode) profilePostalCode.value = user?.postalcode || user?.postalCode || "";

  if (accountGreeting) {
    accountGreeting.textContent = `Welcome back, ${fallbackName || "customer"}`;
  }
};

const renderOrders = (orders) => {
  if (!ordersList) return;

  if (!Array.isArray(orders) || orders.length === 0) {
    ordersList.innerHTML = "<p>You have no orders yet.</p>";
    if (orderCount) orderCount.textContent = "0";
    return;
  }

  if (orderCount) orderCount.textContent = String(orders.length);

  ordersList.innerHTML = orders
    .map((order) => {
      const formattedDate = order.created_at
        ? new Date(order.created_at).toLocaleString()
        : "-";
      const status = String(order.status || "pending").toLowerCase();
      const statusClass = typeof getOrderStatusClass === "function"
        ? getOrderStatusClass(status)
        : "status-pending";
      
      // Display order items with sizes
      const itemsDisplay = (order.items && Array.isArray(order.items) && order.items.length > 0)
        ? `<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);">
             <p><strong>Items:</strong></p>
             ${order.items.map(item => {
               const sizeText = item.product_size ? ` (${item.product_size})` : '';
               return `<p style="margin: 4px 0; font-size: 0.9rem;">• ${item.product_name}${sizeText} ×${item.quantity} - LKR ${Number(item.price || 0).toFixed(2)}</p>`;
             }).join('')}
           </div>`
        : '';
      
      return `
        <article class="order-card">
          <div class="order-card-head">
            <h4>Order #${order.id}</h4>
            <span class="order-status-badge ${statusClass}">${status}</span>
          </div>
          <p><strong>Total:</strong> LKR ${Number(order.total_amount || 0).toFixed(2)}</p>
          <p><strong>Placed:</strong> ${formattedDate}</p>
          ${itemsDisplay}
        </article>
      `;
    })
    .join("");
};

const loadOrders = async (user) => {
  if (!ordersList) return;
  if (!user?.email) {
    ordersList.innerHTML = "<p>Please sign in to see your orders.</p>";
    return;
  }

  if (typeof getOrders === "undefined") {
    ordersList.innerHTML = "<p>Orders API unavailable.</p>";
    return;
  }

  ordersList.innerHTML = "<p>Loading your orders...</p>";

  try {
    const userIdNumeric = Number(user.id);
    const response = await getOrders({
      user_id: Number.isFinite(userIdNumeric) && userIdNumeric > 0 ? userIdNumeric : null,
      user_email: user.email,
      supabase_user_id: user.id || ""
    });

    if (!response.success) {
      ordersList.innerHTML = `<p>${response.data?.message || "Unable to load orders."}</p>`;
      return;
    }

    renderOrders(response.data);
  } catch (error) {
    console.error("Failed to load orders", error);
    ordersList.innerHTML = "<p>Error loading orders. Please try again.</p>";
  }
};

const renderReviews = (reviews) => {
  if (!reviewsList) return;

  if (!Array.isArray(reviews) || reviews.length === 0) {
    reviewsList.innerHTML = "<p>No reviews yet. Share feedback from a product page.</p>";
    if (reviewCount) reviewCount.textContent = "0";
    return;
  }

  if (reviewCount) reviewCount.textContent = String(reviews.length);

  reviewsList.innerHTML = reviews
    .map((review) => {
      const date = review.created_at ? new Date(review.created_at).toLocaleDateString() : "-";
      const stars = "★".repeat(review.rating || 0) + "☆".repeat(5 - (review.rating || 0));
      return `
        <div class="review-item">
          <div class="review-header">
            <div>
              <div class="review-author">${review.product_name || "Product"}</div>
              <div class="review-date">${date}</div>
            </div>
            <div class="review-rating">${stars}</div>
          </div>
          <p class="review-comment">${review.comment || ""}</p>
        </div>
      `;
    })
    .join("");
};

const loadReviews = async (user) => {
  if (!reviewsList) return;

  if (!user?.email) {
    reviewsList.innerHTML = "<p>Please sign in to see your reviews.</p>";
    return;
  }

  if (typeof getUserReviews !== "function") {
    reviewsList.innerHTML = "<p>Reviews API unavailable.</p>";
    return;
  }

  reviewsList.innerHTML = "<p>Loading your reviews...</p>";

  try {
    const response = await getUserReviews({
      email: user.email
    });

    if (!response.success) {
      reviewsList.innerHTML = `<p>${response.data?.message || "Unable to load reviews."}</p>`;
      return;
    }

    renderReviews(response.data);
  } catch (error) {
    console.error("Failed to load reviews", error);
    reviewsList.innerHTML = "<p>Error loading reviews. Please try again.</p>";
  }
};

const updateWishlistCount = () => {
  if (!savedCount) return;
  try {
    const wishlist = JSON.parse(localStorage.getItem("buyLkWishlist") || "[]");
    savedCount.textContent = String(Array.isArray(wishlist) ? wishlist.length : 0);
  } catch (error) {
    savedCount.textContent = "0";
  }
};

const initAccount = () => {
  const user = normalizeStoredUser(getStoredUser());
  const isLoggedIn = Boolean(user && (user.loggedIn || user.email));

  if (!isLoggedIn) {
    if (accountContent) accountContent.style.display = "none";
    if (accountGate) accountGate.style.display = "block";
    return;
  }

  if (accountContent) accountContent.style.display = "grid";
  if (accountGate) accountGate.style.display = "none";

  fillProfileForm(user);
  updateWishlistCount();
  loadOrders(user);
  loadReviews(user);

  if (typeof getUserProfile === "function") {
    const userIdNumeric = Number(user.id);
    const requestToken = ++profileSyncToken;
    const requestedAt = Date.now();

    getUserProfile({
      user_id: Number.isFinite(userIdNumeric) && userIdNumeric > 0 ? userIdNumeric : null,
      email: user.email || ""
    }).then((response) => {
      if (requestToken !== profileSyncToken || requestedAt < lastProfileSaveAt) {
        return;
      }

      if (response.success && response.data) {
        const serverData = response.data.data || response.data;
        const updated = updateLocalUser({
          fullname: serverData.username || user.fullname,
          phone: serverData.phone || "",
          address: serverData.address || "",
          district: serverData.district || "",
          postalcode: serverData.postalcode || ""
        });
        if (updated) {
          fillProfileForm(updated);
        }
      }
    }).catch((error) => {
      console.warn("Unable to load profile", error);
    });
  }
};

  if (profileForm) {
    profileForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      lastProfileSaveAt = Date.now();
      profileSyncToken += 1;

      const storedUser = getStoredUser();
      const payload = {
        user_id: storedUser?.id || null,
        current_email: storedUser?.email || "",
        email: profileEmail?.value.trim() || storedUser?.email || "",
        username: profileName.value.trim(),
        phone: profilePhone.value.trim(),
        address: profileAddress.value.trim(),
        district: profileDistrict?.value.trim() || "",
        postalcode: profilePostalCode?.value.trim() || ""
      };

      console.log("Profile save payload", payload);

      let updated = null;
      let serverUpdated = false;

      if (typeof updateUserProfile === "function") {
        const response = await updateUserProfile(payload);
        console.log("Profile save response", response);
        if (!response.success) {
          showToast(response.data?.message || "Unable to save profile");
          return;
        }

        const serverData = response.data?.data || response.data;
        serverUpdated = Boolean(response.data?.updated) || Boolean(response.data?.created);

        if (serverData) {
          const serverEmail = serverData.email || payload.email;
          const serverPhone = serverData.phone || "";
          const serverAddress = serverData.address || "";
          const serverDistrict = serverData.district || "";
          const serverPostalcode = serverData.postalcode || "";
          const serverName = serverData.username || payload.username;
          const matchesPayload =
            serverEmail === payload.email &&
            serverPhone === payload.phone &&
            serverAddress === payload.address &&
            serverDistrict === payload.district &&
            serverPostalcode === payload.postalcode &&
            (payload.username === "" || serverName === payload.username);

          if (matchesPayload) {
            serverUpdated = true;
          }

          if (serverUpdated) {
            updated = updateLocalUser({
              fullname: serverName,
              email: serverEmail,
              phone: serverPhone,
              address: serverAddress,
              district: serverDistrict,
              postalcode: serverPostalcode
            });
          }
        }
      }

      if (!updated) {
        updated = updateLocalUser({
          fullname: payload.username,
          email: payload.email,
          phone: payload.phone,
          address: payload.address,
          district: payload.district,
          postalcode: payload.postalcode
        });
      }

      if (updated) {
        fillProfileForm(updated);
      }

      showToast(serverUpdated ? "Profile updated successfully!" : "Saved locally. Server did not update.");
    });
  }

  if (profileReset) {
    profileReset.addEventListener("click", () => {
      fillProfileForm(getStoredUser());
      showToast("Profile reset to saved details");
    });
  }

  initAccount();

  if (myOrdersBtn && ordersList) {
    myOrdersBtn.addEventListener("click", () => {
      ordersList.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // Handle scroll to orders section if coming from track order button
  if (window.location.hash === '#accountOrdersList' && ordersList) {
    setTimeout(() => {
      ordersList.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 500);
  }
})();
