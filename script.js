const API = "https://fakestoreapi.com";
const maxQuantity = 10;
const form = document.querySelector(".search-form");
const inputField = document.querySelector(".search-input");
const products = document.querySelector(".products");
const cartProducts = document.querySelector(".cart-products");
const inCart = document.querySelector(".in-cart");
let categories = [];
let cart = [];

inCart.style.display = "none";
updateCartCount();

// Event Listeners
form.addEventListener("submit", handleSearchSubmit);
products.addEventListener("click", handleProductClick);
cartProducts.addEventListener("click", handleCartClick);

// Fetch data
async function init() {
  categories = await fetchCategories();
  console.log(categories);
}

// Event Handlers
async function handleSearchSubmit(event) {
  event.preventDefault();
  const query = inputField.value.trim();
  inputField.value = "";
  if (!query) return;

  const data = await getJson(`products/category/${query}`);
  products.innerHTML = "";

  Array.isArray(data) ? data.forEach(renderProduct) : renderProduct(data);
}

function handleProductClick(event) {
  const addButton = event.target.closest("a.btn");
  const updateButton = event.target.closest("button");
  const card = event.target.closest(".card");
  if (!card) return;

  const quantityField = card.querySelector(".quantity");
  const priceField = card.querySelector(".total-price");
  const pricePerItem = card.dataset.price;

  if (addButton) {
    initializeCartProduct(card, priceField, quantityField, pricePerItem);
  }

  if (updateButton) {
    updateQuantity(updateButton);
  }
}

function handleCartClick(event) {
  event.stopPropagation();
  const updateButton = event.target.closest("button");

  if (updateButton) {
    updateQuantity(updateButton, true);
  }
}

// Helper Functions
async function getJson(query) {
  try {
    const response = await fetch(`${API}/${query}`);
    if (!response.ok) throw new Error("404 not found");
    return await response.json();
  } catch (error) {
    console.error(error);
  }
}

async function fetchCategories() {
  const response = await fetch(`${API}/products/categories`);
  return response.json();
}

function renderProduct(product) {
  const markup = `
    <div class="card" id="${product.id}" data-quantity="1" data-price="${product.price}">
      <div>
        <div class="img" style="background-image: url('${product.image}');"></div>
        <div class="card-body">
          <h4 class="card-title">${product.title}</h4>
          <p class="category">${product.category}</p>
          <p class="card-text description">${product.description}</p>
        </div>
      </div>
      <div class="purchase">
        <a class="btn btn-primary" style="cursor:pointer;">Add to cart</a>
        <div class="price">
          <div class="custom-number-input">
            <button class="decrease">-</button>
            <input type="number" class="number-input quantity" min="0" max="${maxQuantity}" value="1">
            <button class="increase">+</button>
          </div>
          <h5 class="total-price">${product.price} $</h5>
        </div>
      </div>
    </div>
  `;
  products.insertAdjacentHTML("beforeend", markup);
}

function initializeCartProduct(card, priceField, quantityField, pricePerItem) {
  if (!cart.includes(card)) {
    quantityField.value = 1;
    priceField.textContent = `${pricePerItem} $`;
    addToCart(card);
  }
}

function addToCart(product) {
  cart.push(product);
  updateCart();
}

function updateQuantity(button, fromCart = false) {
  const card = button.closest(".card");
  const quantityField = card.querySelector(".quantity");
  const priceField = card.querySelector(".total-price");
  const pricePerItem = card.dataset.price;

  if (
    button.classList.contains("increase") &&
    +quantityField.value < maxQuantity
  ) {
    quantityField.value = +quantityField.value + 1;
  } else if (
    button.classList.contains("decrease") &&
    +quantityField.value > 0
  ) {
    quantityField.value = +quantityField.value - 1;
    if (fromCart && +quantityField.value === 0) {
      removeFromCart(card);
    }
  }

  card.dataset.quantity = quantityField.value;
  priceField.textContent = `${pricePerItem * quantityField.value} $`;
}

function removeFromCart(card) {
  const index = cart.indexOf(card);
  cart.splice(index, 1);
  console.log(cart);
  updateCart();
}

function updateCart() {
  cartProducts.innerHTML = "";
  cart.forEach((item) => cartProducts.appendChild(item.cloneNode(true)));
  updateCartCount();
}

function updateCartCount() {
  inCart.textContent = cart.length;
  inCart.style.display = cart.length > 0 ? "flex" : "none";
}

init();
