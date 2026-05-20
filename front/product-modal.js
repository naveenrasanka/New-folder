// Product Details Modal Management
console.log("product-modal.js loaded");

let currentProductId = null;
let selectedRating = 0;

// Open product details modal
async function openProductModal(productId) {
  currentProductId = productId;
  const product = products.find(p => p.id === productId);
  
  if (!product) {
    showToast("Product not found");
    return;
  }
  
  const modal = document.getElementById("productModal");
  
  // Populate product details
  document.getElementById("productModalImage").src = product.image;
  document.getElementById("productModalImage").alt = product.name;
  document.getElementById("productModalName").textContent = product.name;
  document.getElementById("productModalPrice").textContent = currency.format(product.price);
  document.getElementById("productModalDescription").textContent = product.description || "Premium quality product for your everyday needs.";
  
  // Display size if applicable (pizza, rice, kottu)
  const productModalInfo = document.querySelector(".product-modal-info");
  const existingSizeDisplay = productModalInfo?.querySelector(".size-modal");
  if (existingSizeDisplay) existingSizeDisplay.remove();
  
  if ((product.category === 'pizza' || product.category === 'rice' || product.category === 'kottu') && product.size) {
    const sizeDisplay = document.createElement("div");
    sizeDisplay.className = "size-modal";
    sizeDisplay.style.cssText = "font-size: 1rem; margin: 8px 0; padding: 8px 12px; background: rgba(99, 102, 241, 0.1); border-radius: 8px; color: #6366f1; font-weight: 600; text-transform: capitalize; display: inline-block;";
    
    let emoji = '🍕';
    let label = 'Size';
    if (product.category === 'rice') {
      emoji = '🍚';
      label = 'Portion Size';
    } else if (product.category === 'kottu') {
      emoji = '🥘';
      label = 'Portion Size';
    }
    
    sizeDisplay.textContent = `${emoji} ${label}: ${product.size}`;
    const priceElement = document.getElementById("productModalPrice");
    if (priceElement) {
      priceElement.parentElement.insertBefore(sizeDisplay, priceElement.nextSibling);
    }
  }
  
  // Set rating stars
  const stars = generateStars(product.rating);
  document.getElementById("productModalStars").innerHTML = stars;
  document.getElementById("productModalRating").textContent = product.rating.toFixed(1);
  
  // Load reviews
  await loadProductReviews(productId);
  
  // Show modal
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
  
  // Reset review form
  resetReviewForm();

  const reviewNameInput = document.getElementById("reviewName");
  if (reviewNameInput && state?.user?.email) {
    const fallbackName = state.user.fullname || state.user.username || state.user.email.split("@")[0];
    if (!reviewNameInput.value.trim()) {
      reviewNameInput.value = fallbackName;
    }
  }
}

// Close product details modal
function closeProductModal() {
  const modal = document.getElementById("productModal");
  modal.style.display = "none";
  document.body.style.overflow = "auto";
  currentProductId = null;
  selectedRating = 0;
}

// Load product reviews
async function loadProductReviews(productId) {
  try {
    const response = await getProductReviews(productId);
    
    if (response.success && response.data) {
      const { reviews, average_rating, total_reviews } = response.data;
      
      // Update average rating
      document.getElementById("averageRatingNumber").textContent = average_rating || "0.0";
      document.getElementById("averageRatingStars").innerHTML = generateStars(average_rating || 0);
      document.getElementById("totalReviewsCount").textContent = `${total_reviews} ${total_reviews === 1 ? 'review' : 'reviews'}`;
      document.getElementById("productModalReviewCount").textContent = `(${total_reviews} reviews)`;
      
      // Display reviews
      displayReviews(reviews);
    } else {
      displayReviews([]);
    }
  } catch (error) {
    console.error("Error loading reviews:", error);
    displayReviews([]);
  }
}

// Display reviews in the list
function displayReviews(reviews) {
  const reviewsList = document.getElementById("reviewsList");
  
  if (!reviews || reviews.length === 0) {
    reviewsList.innerHTML = '<p class="no-reviews">No reviews yet. Be the first to review!</p>';
    return;
  }
  
  reviewsList.innerHTML = reviews.map(review => `
    <div class="review-item">
      <div class="review-header">
        <div>
          <div class="review-author">${escapeHtml(review.user_name)}</div>
          <div class="review-date">${formatDate(review.created_at)}</div>
        </div>
        <div class="review-rating">${generateStars(review.rating)}</div>
      </div>
      <p class="review-comment">${escapeHtml(review.comment)}</p>
    </div>
  `).join('');
}

// Generate star rating HTML
function generateStars(rating) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  
  let stars = '';
  for (let i = 0; i < fullStars; i++) stars += '★';
  if (hasHalfStar) stars += '⯨';
  for (let i = 0; i < emptyStars; i++) stars += '☆';
  
  return stars;
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return date.toLocaleDateString();
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

const getActiveUserKey = () => {
  if (typeof state === "undefined" || !state.user || !state.user.loggedIn) {
    return "";
  }
  return state.user.email || state.user.id || state.user.username || "";
};

const storeUserReview = (review) => {
  if (!review || !review.userKey) return;

  try {
    const stored = JSON.parse(localStorage.getItem("buyLkUserReviews") || "[]");
    const updated = Array.isArray(stored) ? stored : [];
    updated.unshift(review);
    localStorage.setItem("buyLkUserReviews", JSON.stringify(updated));
  } catch (error) {
    console.warn("Unable to store user review", error);
  }
};

// Reset review form
function resetReviewForm() {
  document.getElementById("reviewForm").reset();
  document.getElementById("reviewRating").value = "";
  selectedRating = 0;
  
  // Reset star display
  const stars = document.querySelectorAll("#starRatingInput .star");
  stars.forEach(star => star.classList.remove("active"));
}

// Handle review form submission
async function submitReview(event) {
  event.preventDefault();
  
  console.log("Submit review called");
  
  if (!currentProductId) {
    showToast("Invalid product");
    console.error("No current product ID");
    return;
  }
  
  const defaultName = (state?.user?.fullname || state?.user?.username || (state?.user?.email ? state.user.email.split("@")[0] : "")).trim();
  const userName = document.getElementById("reviewName").value.trim() || defaultName;
  const comment = document.getElementById("reviewComment").value.trim();
  const rating = selectedRating;
  
  console.log("Review data:", { userName, comment, rating, productId: currentProductId });
  
  // Validate
  if (!userName || !comment || rating === 0) {
    showToast("Please fill in all fields and select a rating");
    console.error("Validation failed:", { userName: !!userName, comment: !!comment, rating });
    return;
  }
  
  if (comment.length < 10) {
    showToast("Review must be at least 10 characters long");
    console.error("Comment too short:", comment.length);
    return;
  }
  
  // Submit review
  try {
    console.log("Calling addProductReview API...");
    const response = await addProductReview(
      currentProductId,
      userName,
      rating,
      comment,
      state?.user?.id,
      state?.user?.email || ""
    );
    
    console.log("API Response:", response);
    
    if (response.success || (response.data && response.data.success)) {
      showToast("Review submitted successfully!");
      resetReviewForm();

      const userKey = getActiveUserKey();
      const product = products.find((item) => item.id === currentProductId);
      if (userKey && product) {
        storeUserReview({
          id: `${currentProductId}-${Date.now()}`,
          userKey,
          product_id: currentProductId,
          product_name: product.name || "Product",
          rating,
          comment,
          created_at: new Date().toISOString()
        });
      }
      
      // Reload reviews
      console.log("Reloading reviews...");
      await loadProductReviews(currentProductId);
      
      // Reload products to update the rating
      console.log("Reloading products...");
      await loadProducts();
    } else {
      const errorMsg = response.data?.message || response.message || "Failed to submit review";
      console.error("Review submission failed:", errorMsg);
      showToast(errorMsg);
    }
  } catch (error) {
    console.error("Error submitting review:", error);
    showToast("Error submitting review. Please try again.");
  }
}

// Initialize product modal event listeners
function initializeProductModal() {
  const modal = document.getElementById("productModal");
  const closeBtn = document.getElementById("closeProductModal");
  const addToCartBtn = document.getElementById("productModalAddCart");
  const wishlistBtn = document.getElementById("productModalWishlist");
  const reviewForm = document.getElementById("reviewForm");
  const starRatingInput = document.getElementById("starRatingInput");
  
  // Close modal
  if (closeBtn) {
    closeBtn.addEventListener("click", closeProductModal);
  }
  
  // Close on background click
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeProductModal();
      }
    });
  }
  
  // Add to cart from modal
  if (addToCartBtn) {
    addToCartBtn.addEventListener("click", () => {
      if (currentProductId) {
        const qty = state.cart.get(currentProductId) || 0;
        state.cart.set(currentProductId, qty + 1);
        saveCart();
        renderCart();
        updateCounts();
        showToast("Added to cart");
      }
    });
  }
  
  // Add to wishlist from modal
  if (wishlistBtn) {
    wishlistBtn.addEventListener("click", () => {
      const normalizedId = Number(currentProductId);

      if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
        showToast("This product cannot be added to wishlist");
        return;
      }

      if (state.wishlist.has(normalizedId)) {
          state.wishlist.delete(normalizedId);
          showToast("Removed from wishlist");
          wishlistBtn.textContent = "❤️ Wishlist";
        } else {
          state.wishlist.add(normalizedId);
          showToast("Added to wishlist");
          wishlistBtn.textContent = "❤️ In Wishlist";
        }
        saveWishlist();
        updateCounts();
        applyFilters();
    });
  }
  
  // Star rating input
  if (starRatingInput) {
    const stars = starRatingInput.querySelectorAll(".star");
    
    stars.forEach(star => {
      star.addEventListener("click", () => {
        const rating = parseInt(star.dataset.rating);
        selectedRating = rating;
        document.getElementById("reviewRating").value = rating;
        
        // Update star display
        stars.forEach((s, index) => {
          if (index < rating) {
            s.classList.add("active");
          } else {
            s.classList.remove("active");
          }
        });
      });
      
      star.addEventListener("mouseenter", () => {
        const rating = parseInt(star.dataset.rating);
        stars.forEach((s, index) => {
          if (index < rating) {
            s.style.color = "#fbbf24";
          } else {
            s.style.color = "#d1d5db";
          }
        });
      });
    });
    
    starRatingInput.addEventListener("mouseleave", () => {
      stars.forEach((s, index) => {
        if (index < selectedRating) {
          s.style.color = "#fbbf24";
        } else {
          s.style.color = "#d1d5db";
        }
      });
    });
  }
  
  // Review form submission
  if (reviewForm) {
    reviewForm.addEventListener("submit", submitReview);
  }
}

// Call initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeProductModal);
} else {
  initializeProductModal();
}
