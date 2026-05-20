// Supabase configuration
const SUPABASE_URL = 'https://iyyetrmcfnxrgicrtexi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5eWV0cm1jZm54cmdpY3J0ZXhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMjExODYsImV4cCI6MjA4Mjg5NzE4Nn0.Ms3mPKkAquP9PCMfS1v8ea1VLRn68_cJLrf7r-IVfhM';

let supabaseClient = null;

async function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.4/+esm');
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabaseClient;
}

// PHP backend configuration for non-auth endpoints
const API_BASE_URL = 'http://localhost/E%20commerce/New-folder/backend';
const API_ENDPOINTS = {
  auth: {
    signup: `${API_BASE_URL}/auth/signup.php`
  },
  contact: `${API_BASE_URL}/contact/submit.php`,
  products: `${API_BASE_URL}/products/list.php`,
  advertisements: `${API_BASE_URL}/advertisements/list.php`,
  orders: `${API_BASE_URL}/orders/list.php`,
  payments: {
    createCheckout: `${API_BASE_URL}/payments/create-checkout.php`
  },
  users: {
    profile: `${API_BASE_URL}/users/profile.php`
  },
  reviews: {
    get: `${API_BASE_URL}/reviews/get.php`,
    add: `${API_BASE_URL}/reviews/add.php`,
    user: `${API_BASE_URL}/reviews/user.php`
  },
  siteReviews: {
    get: `${API_BASE_URL}/site-reviews/get.php`,
    add: `${API_BASE_URL}/site-reviews/add.php`
  }
};

const AUTH_REDIRECT_URL = new URL('confirm.html', window.location.href).href;

// Helper function for PHP API calls (non-auth)
async function phpApiCall(endpoint, method = 'POST', data = null) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }
    const response = await fetch(endpoint, options);
    const result = await response.json();
    return {
      success: response.ok,
      status: response.status,
      data: result
    };
  } catch (error) {
    console.error('PHP API Error:', error);
    return {
      success: false,
      status: 0,
      data: { message: 'Network error. Please try again.' }
    };
  }
}

function normalizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id ?? null,
    username: user.user_metadata?.username ?? user.email?.split('@')[0] ?? '',
    email: user.email ?? ''
  };
}

// Authentication functions using Supabase
async function loginUser(email, password) {
  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return {
        success: false,
        status: 401,
        data: {
          message: error.message || 'Login failed. Please check your credentials.'
        }
      };
    }

    // Check if email is confirmed
    if (!data.user?.email_confirmed_at) {
      return {
        success: false,
        status: 403,
        data: {
          message: 'Please confirm your email address before logging in. Check your inbox for the confirmation link.'
        }
      };
    }

    return {
      success: true,
      status: 200,
      data: {
        message: 'Login successful',
        user: normalizeUser(data.user)
      }
    };
  } catch (error) {
    console.error('Login Error:', error);
    return {
      success: false,
      status: 500,
      data: { message: error.message || 'An error occurred during login' }
    };
  }
}

// Signup function using Supabase
async function signupUser(username, email, password, confirmPassword) {
  if (password !== confirmPassword) {
    return {
      success: false,
      status: 400,
      data: { message: 'Passwords do not match' }
    };
  }

  if (password.length < 6) {
    return {
      success: false,
      status: 400,
      data: { message: 'Password must be at least 6 characters' }
    };
  }

  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: AUTH_REDIRECT_URL,
        data: {
          username: username
        }
      }
    });

    if (error) {
      const errorMessage = error.message || '';

      // Handle rate limit errors
      if (errorMessage.includes('rate') || errorMessage.includes('too many')) {
        return {
          success: false,
          status: 429,
          data: {
            message: 'Too many signup attempts for now. If you already created an account, try signing in. Otherwise wait a few minutes and try again.'
          }
        };
      }
      
      // Handle other errors
      return {
        success: false,
        status: 400,
        data: {
          message: errorMessage || 'Signup failed. Please try again.'
        }
      };
    }

    const isExistingAccount = data.user?.identities?.length === 0;

    if (!isExistingAccount) {
      // Keep MySQL users table in sync for backend features that rely on it.
      const syncResponse = await phpApiCall(API_ENDPOINTS.auth.signup, 'POST', {
        username,
        email,
        password,
        confirmPassword
      });

      if (!syncResponse.success) {
        return {
          success: false,
          status: syncResponse.status || 500,
          data: {
            message: syncResponse.data?.message || 'Account created in auth provider, but failed to save user profile.'
          }
        };
      }
    }

    return {
      success: true,
      status: 201,
      data: {
        message: isExistingAccount
          ? 'Account already exists with this email'
          : 'Account created successfully! Check your email for verification.',
        userId: data.user?.id,
        user: {
          id: data.user?.id,
          username: username,
          email: email
        }
      }
    };
  } catch (error) {
    console.error('Signup Error:', error);
    return {
      success: false,
      status: 500,
      data: { message: error.message || 'An error occurred during signup' }
    };
  }
}

// Logout function using Supabase
async function logoutUser() {
  try {
    const supabase = await getSupabaseClient();
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return {
        success: false,
        status: 500,
        data: { message: error.message || 'Logout failed. Please try again.' }
      };
    }

    localStorage.removeItem('buyLkCart');
    localStorage.removeItem('buyLkWishlist');

    return {
      success: true,
      status: 200,
      data: { message: 'Logged out successfully' }
    };
  } catch (error) {
    console.error('Logout Error:', error);
    return {
      success: false,
      status: 500,
      data: { message: error.message || 'An error occurred during logout' }
    };
  }
}

// Get current authenticated user from localStorage
async function getCurrentUser() {
  try {
    const storedUser = JSON.parse(localStorage.getItem('user') || 'null');

    if (!storedUser) {
      return { success: false, user: null };
    }

    return {
      success: true,
      user: {
        id: storedUser.id ?? null,
        email: storedUser.email ?? '',
        username: storedUser.username || storedUser.fullname || (storedUser.email ? storedUser.email.split('@')[0] : '')
      }
    };
  } catch (error) {
    console.error('Get User Error:', error.message);
    return { success: false, user: null };
  }
}

// Listen for auth state changes using storage events
function onAuthStateChange(callback) {
  const emitCurrentState = () => {
    const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
    callback(storedUser ? 'SIGNED_IN' : 'SIGNED_OUT', storedUser);
  };

  window.addEventListener('storage', emitCurrentState);
  emitCurrentState();

  return {
    data: {
      subscription: {
        unsubscribe() {
          window.removeEventListener('storage', emitCurrentState);
        }
      }
    }
  };
}

// ==================== NON-AUTH FUNCTIONS (KEEP USING PHP BACKEND) ====================

// Contact function - unchanged (still uses PHP)
async function submitContact(name, email, subject, message) {
  return phpApiCall(API_ENDPOINTS.contact, 'POST', {
    name,
    email,
    subject,
    message
  });
}

// Get products function - unchanged (still uses PHP)
async function getProducts() {
  return phpApiCall(API_ENDPOINTS.products, 'GET');
}

async function getAdvertisements(adminToken = null) {
  const endpoint = adminToken
    ? `${API_ENDPOINTS.advertisements}?all=1&adminToken=${encodeURIComponent(adminToken)}`
    : API_ENDPOINTS.advertisements;
  const response = await phpApiCall(endpoint, 'GET');

  if (!response.success) {
    return response;
  }

  if (Array.isArray(response.data)) {
    return response;
  }

  if (response.data && Array.isArray(response.data.data)) {
    return {
      ...response,
      data: response.data.data
    };
  }

  return {
    ...response,
    success: false,
    data: []
  };
}

async function createAdvertisement(advertisementData) {
  return phpApiCall(API_ENDPOINTS.advertisements, 'POST', {
    ...advertisementData,
    action: 'create'
  });
}

async function updateAdvertisement(advertisementData) {
  return phpApiCall(API_ENDPOINTS.advertisements, 'POST', {
    ...advertisementData,
    action: 'update'
  });
}

async function deleteAdvertisement(advertisementId, adminToken) {
  return phpApiCall(API_ENDPOINTS.advertisements, 'POST', {
    id: advertisementId,
    adminToken,
    action: 'delete'
  });
}

async function getOrders(filters = {}, adminToken = null) {
  const queryParams = new URLSearchParams();

  if (adminToken) {
    queryParams.set('all', '1');
    queryParams.set('adminToken', adminToken);
  }

  if (filters.user_id) {
    queryParams.set('user_id', String(filters.user_id));
  }

  if (filters.supabase_user_id) {
    queryParams.set('supabase_user_id', filters.supabase_user_id);
  }

  if (filters.user_email) {
    queryParams.set('user_email', filters.user_email);
  }

  if (filters.district) {
    queryParams.set('district', filters.district);
  }

  const endpoint = queryParams.toString()
    ? `${API_ENDPOINTS.orders}?${queryParams.toString()}`
    : API_ENDPOINTS.orders;

  const response = await phpApiCall(endpoint, 'GET');
  if (response.success && response.data && Array.isArray(response.data.data)) {
    return {
      ...response,
      data: response.data.data
    };
  }

  if (response.success && Array.isArray(response.data)) {
    return response;
  }

  return {
    ...response,
    data: []
  };
}

async function createOrder(orderData) {
  return phpApiCall(API_ENDPOINTS.orders, 'POST', orderData);
}

async function updateOrderStatus(orderId, status, adminToken) {
  return phpApiCall(API_ENDPOINTS.orders, 'PUT', {
    id: orderId,
    status,
    adminToken
  });
}

// Get product reviews - unchanged (still uses PHP)
async function getProductReviews(productId) {
  try {
    const response = await fetch(`${API_ENDPOINTS.reviews.get}?product_id=${productId}`);
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return {
      success: false,
      message: 'Failed to load reviews'
    };
  }
}

// Add product review - unchanged (still uses PHP)
async function addProductReview(productId, userName, rating, comment, userId = null, userEmail = '') {
  return phpApiCall(API_ENDPOINTS.reviews.add, 'POST', {
    product_id: productId,
    user_name: userName,
    user_id: userId,
    user_email: userEmail,
    rating: rating,
    comment: comment
  });
}

async function getSiteReviews() {
  const response = await phpApiCall(API_ENDPOINTS.siteReviews.get, 'GET');

  if (response.success && response.data && Array.isArray(response.data.data?.reviews)) {
    return {
      ...response,
      data: response.data.data
    };
  }

  if (response.success && Array.isArray(response.data)) {
    return response;
  }

  return {
    ...response,
    data: {
      reviews: [],
      average_rating: 0,
      total_reviews: 0
    }
  };
}

async function addSiteReview(payload) {
  return phpApiCall(API_ENDPOINTS.siteReviews.add, 'POST', payload);
}

async function getUserReviews(filters = {}) {
  const queryParams = new URLSearchParams();

  if (filters.user_id) {
    queryParams.set('user_id', String(filters.user_id));
  }
  if (filters.email) {
    queryParams.set('email', filters.email);
  } else if (filters.user_email) {
    queryParams.set('email', filters.user_email);
  }
  if (filters.user_name) {
    queryParams.set('user_name', filters.user_name);
  }

  const endpoint = queryParams.toString()
    ? `${API_ENDPOINTS.reviews.user}?${queryParams.toString()}`
    : API_ENDPOINTS.reviews.user;

  const response = await phpApiCall(endpoint, 'GET');
  if (response.success && response.data && Array.isArray(response.data.data)) {
    return {
      ...response,
      data: response.data.data
    };
  }

  if (response.success && Array.isArray(response.data)) {
    return response;
  }

  return {
    ...response,
    data: []
  };
}

async function getUserProfile(filters = {}) {
  const queryParams = new URLSearchParams();

  if (filters.user_id) {
    queryParams.set('user_id', String(filters.user_id));
  }

  if (filters.email) {
    queryParams.set('email', filters.email);
  }

  const endpoint = queryParams.toString()
    ? `${API_ENDPOINTS.users.profile}?${queryParams.toString()}`
    : API_ENDPOINTS.users.profile;

  const response = await phpApiCall(endpoint, 'GET');

  if (response.success && response.data && response.data.data) {
    return {
      ...response,
      data: response.data.data
    };
  }

  return response;
}

async function updateUserProfile(payload) {
  return phpApiCall(API_ENDPOINTS.users.profile, 'POST', payload);
}

// Expose helpers globally for plain browser script tags
window.loginUser = loginUser;
window.signupUser = signupUser;
window.logoutUser = logoutUser;
window.getCurrentUser = getCurrentUser;
window.onAuthStateChange = onAuthStateChange;
window.submitContact = submitContact;
window.getProducts = getProducts;
window.getAdvertisements = getAdvertisements;
window.createAdvertisement = createAdvertisement;
window.updateAdvertisement = updateAdvertisement;
window.deleteAdvertisement = deleteAdvertisement;
window.getOrders = getOrders;
window.createOrder = createOrder;
window.updateOrderStatus = updateOrderStatus;
window.getProductReviews = getProductReviews;
window.addProductReview = addProductReview;
window.getSiteReviews = getSiteReviews;
window.addSiteReview = addSiteReview;
window.getUserReviews = getUserReviews;
window.getUserProfile = getUserProfile;
window.updateUserProfile = updateUserProfile;

// Floating social share widget (all non-admin pages)
function shouldShowShareWidget() {
  const path = window.location.pathname.toLowerCase();
  return !path.includes('admin');
}

function injectShareWidgetStyles() {
  if (document.getElementById('socialShareWidgetStyles')) return;

  const style = document.createElement('style');
  style.id = 'socialShareWidgetStyles';
  style.textContent = `
    .social-share-widget {
      position: fixed;
      left: 18px;
      bottom: 18px;
      z-index: 1500;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;
    }

    .social-share-list {
      display: none;
      flex-direction: column;
      gap: 8px;
      align-items: flex-start;
    }

    .social-share-widget.open .social-share-list {
      display: flex;
    }

    .social-share-main,
    .social-share-item {
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text);
      border-radius: 999px;
      cursor: pointer;
      box-shadow: var(--shadow);
      font: inherit;
      font-weight: 700;
    }

    .social-share-main {
      min-height: 52px;
      padding: 0 18px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.95rem;
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      color: #fff;
      border: none;
      white-space: nowrap;
    }

    .social-share-item {
      min-width: 118px;
      padding: 10px 14px;
      text-decoration: none;
      text-align: center;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: transform 0.2s ease;
    }

    .social-share-item:hover,
    .social-share-main:hover {
      transform: translateY(-2px);
    }

    @media (max-width: 640px) {
      .social-share-widget {
        left: 12px;
        bottom: 12px;
      }

      .social-share-item {
        min-width: 104px;
        padding: 9px 12px;
        font-size: 0.9rem;
      }
    }
  `;
  document.head.appendChild(style);
}

function initShareWidget() {
  if (!shouldShowShareWidget()) return;
  if (document.getElementById('socialShareWidget')) return;

  injectShareWidgetStyles();

  const shareUrl = encodeURIComponent(window.location.href);
  const shareText = encodeURIComponent(`Check this out: ${document.title}`);

  const wrapper = document.createElement('div');
  wrapper.className = 'social-share-widget';
  wrapper.id = 'socialShareWidget';

  wrapper.innerHTML = `
    <div class="social-share-list" id="socialShareList">
      <a class="social-share-item" href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" target="_blank" rel="noopener noreferrer">Facebook</a>
      <a class="social-share-item" href="https://wa.me/?text=${shareText}%20${shareUrl}" target="_blank" rel="noopener noreferrer">WhatsApp</a>
      <a class="social-share-item" href="https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}" target="_blank" rel="noopener noreferrer">X</a>
      <button class="social-share-item" type="button" id="instagramShareBtn">Instagram</button>
    </div>
    <button class="social-share-main" id="socialShareMainBtn" aria-label="Share your experience">Share Experience</button>
  `;

  document.body.appendChild(wrapper);

  const mainBtn = document.getElementById('socialShareMainBtn');
  const instagramBtn = document.getElementById('instagramShareBtn');
  const socialShareLinks = wrapper.querySelectorAll('a.social-share-item');

  const copyWebsiteLink = async (showAlert = false) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(window.location.href);
      }
      if (showAlert) {
        alert('Website link copied. Paste it in your post, story, or message.');
      }
    } catch (error) {
      console.warn('Clipboard copy failed:', error);
    }
  };

  if (mainBtn) {
    mainBtn.addEventListener('click', () => {
      wrapper.classList.toggle('open');
    });
  }

  socialShareLinks.forEach((linkEl) => {
    linkEl.addEventListener('click', () => {
      copyWebsiteLink(true);
    });
  });

  if (instagramBtn) {
    instagramBtn.addEventListener('click', async () => {
      await copyWebsiteLink(true);
      window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
    });
  }

  document.addEventListener('click', (event) => {
    if (!wrapper.contains(event.target)) {
      wrapper.classList.remove('open');
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initShareWidget);
} else {
  initShareWidget();
}
