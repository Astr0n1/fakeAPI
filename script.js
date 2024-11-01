"use strict";
const API = "https://fakestoreapi.com";
const maxQuantity = 10;
const formDOM = document.querySelector(".search-form");
const inputField = document.querySelector(".search-input");
const productsDOM = document.querySelector(".products");
const cartProductsDOM = document.querySelector(".cart-products");
const suggestionsContainer = document.querySelector(".suggestions");
const inCartDOM = document.querySelector(".in-cart");
const inCartNumber = document.querySelector(".in-cart");
let categories = [];
let allProducts = [];
let titles = [];
let cart = new Map();

/////////////////////////////////////////////////////////
formDOM.addEventListener("submit", (e) => {
  e.preventDefault();
  search(inputField.value.trim());
  inputField.value = "";
  suggestionsContainer.style.visibility = "hidden";
});

inputField.addEventListener("input", (e) => {
  e.preventDefault();
  suggestions(e.target.value.trim().toLowerCase());
});

productsDOM.addEventListener("click", (e) => {
  const update = e.target.closest("button");
  const add = e.target.closest("a.btn");
  const card = e.target.closest(".card");
  // control quantity
  if (update) {
    updateCardQuantity(card, update.classList[0]);
  }
  // control adding to cart
  if (add) {
    if (card.dataset.quantity > 0) addToCart(card.id, +card.dataset.quantity);
    card.dataset.quantity = 1;
    card.querySelector(".quantity").value = 1;
    card.querySelector(".total-price").textContent = card.dataset.price + " $";
  }
});

cartProductsDOM.addEventListener("click", (e) => {
  e.stopPropagation();
  const update = e.target.closest("button");
  const card = e.target.closest(".card");
  if (!card) return;
  const id = card.id;
  const quantity = card.querySelector(".quantity").value;

  // control quantity
  if (update) {
    updateCardQuantity(card, update.classList[0], true);
    if (!+card.dataset.quantity) {
      removeFromCart(id);
    }
  }
});

///////////////////////////////////////////////////////////
async function fetchStarter() {
  try {
    const res1 = await fetch(`${API}/products/categories`);
    categories = await res1.json();

    const res2 = await fetch(`${API}/products`);
    allProducts = await res2.json();

    titles = allProducts.map((product) => [product.id, product.title]);
  } catch (error) {
    console.error("Failed to fetch data:", error);
  }
}

async function getJSON(query) {
  try {
    const res = await fetch(`${API}${query}`);
    const data = await res.json();
    if (Array.isArray(data)) return data;
    return [data];
  } catch (error) {
    console.error("Failed to fetch data:", error);
  }
}

function suggestions(value, getSuggestions = false) {
  suggestionsContainer.innerHTML = "";

  if (!value) {
    suggestionsContainer.style.visibility = "hidden";
    return;
  }

  const filteredTitles = titles
    .filter(([id, title]) => title.toLowerCase().includes(value))
    .map(([id, title]) => title);

  if (getSuggestions) return [...new Set(filteredTitles)];

  // Display suggestions
  filteredTitles.forEach((title) => {
    const suggestionItem = document.createElement("div");
    suggestionItem.className = "suggestion-item";
    suggestionItem.textContent = title;

    // Click event to fill input with selected suggestion
    suggestionItem.addEventListener("click", () => {
      inputField.value = title;
      suggestionsContainer.innerHTML = "";
      inputField.focus();
    });

    suggestionsContainer.appendChild(suggestionItem);

    suggestionsContainer.style.visibility = "visible";
  });
}

async function search(query) {
  let closestProducts = [],
    category;
  const [product] = allProducts.filter((product) => product.title === query);
  if (!product) {
    const suggests = suggestions(query, true);
    allProducts.forEach((element) => {
      if (suggests.includes(element.title)) closestProducts.push(element);
    });
    category = closestProducts[0].category;

    generateProductsDOM(closestProducts, category);
    return;
  }
  category = product.category;
  generateProductsDOM([product], category);
}
//////////////////////////////////////////////////////////
async function generateProductsDOM(products, category) {
  try {
    // console.log("generateProductsDOM", products, category);
    // console.log("*".repeat(50));

    const promises = products.map((product) =>
      getJSON(`/products/${product.id}`)
    );
    promises.push(getJSON(`/products/category/${category}`));

    let results = await Promise.all(promises);
    results = results.flat();

    const uniqueProducts = Array.from(
      new Set(results.map((product) => product.id))
    ).map((id) => results.find((product) => product.id === id));

    productsDOM.innerHTML = "";
    uniqueProducts.forEach((product) => renderProduct(product));
  } catch (error) {
    console.error("Error in generateProductsDOM:", error);
  }
}

function renderProduct(product, intoCart = false, quantity = 1) {
  const markup = `
          <div class="card" id='${
            product.id
          }' data-quantity="${quantity}" data-price="${product.price}">
            <div>
              <div class="img"
                style="background-image: url('${product.image}');">
              </div>
              <div class="card-body">
                <h4 class="card-title">${product.title}</h5>
                <p class="category">${product.category}</p>
                <p class="card-text description">
                  ${product.description}
                </p>
              </div>

            </div>
            <div class='purchase'>
              <a class="btn btn-primary">Add to cart</a>
              <div class="price">
                <div class="custom-number-input">
                  <button class="decrease">-</button>
                  <input type="number" class="number-input quantity" min="0"
                    max="10"
                    value="${quantity}" disabled>
                  <button class="increase">+</button>
                </div>

                <h5 class="total-price">${product.price * quantity} $</h5>
              </div>
            </div>
          </div>
  `;
  if (!intoCart) productsDOM.insertAdjacentHTML("beforeend", markup);
  else cartProductsDOM.insertAdjacentHTML("afterbegin", markup);
}

async function addToCart(id, quantity) {
  // console.log(cart, "addtocart", id, quantity);
  // console.log("*".repeat(50));

  if (cart.has(id)) {
    updateCartProduct(id, cart.get(id) + quantity);
    cart.set(id, cart.get(id) + quantity);
  } else {
    const [product] = await getJSON(`/products/${id}`);
    renderProduct(product, true, +quantity);

    cart.set(id, quantity);
  }
  updateCartCount();
  setLocalStorage();
}

function removeFromCart(id) {
  // console.log(cart, "removefromcart", id);
  // console.log("*".repeat(50));

  cart.delete(id);

  const card = cartProductsDOM.querySelector(`[id='${id}']`);
  if (card) cartProductsDOM.removeChild(card);

  updateCartCount();
}

function updateCartProduct(id, quantity) {
  // console.log(cart, "updatecartproduct", id, quantity);
  // console.log("*".repeat(50));

  const card = cartProductsDOM.querySelector(`[id='${id}']`);
  if (!card) return;
  card.dataset.quantity = quantity;
  card.querySelector(".quantity").value = quantity;
  card.querySelector(".total-price").textContent =
    +card.dataset.price * quantity + " $";
}

function updateCartCount() {
  // console.log(cart, "updatecartcount");
  // console.log("*".repeat(50));

  inCartNumber.textContent = Array.from(cart.values()).reduce(
    (sum, num) => sum + num,
    0
  );
  inCartNumber.style.visibility =
    inCartNumber.textContent > 0 ? "visible" : "hidden";
}

function updateCardQuantity(card, action, fromCart = false) {
  // console.log(cart, "updatecartquantity", card, action);
  // console.log("*".repeat(50));

  const priceEL = card.querySelector(".total-price");
  const quantityEL = card.querySelector(".quantity");
  const ppi = +card.dataset.price;

  let quantity = +card.dataset.quantity;
  if (action === "increase" && quantity < maxQuantity) {
    quantity += 1;
  } else if (action === "decrease" && quantity > 0) {
    quantity -= 1;
  }

  card.dataset.quantity = quantity;
  quantityEL.value = quantity;
  priceEL.textContent = (ppi * quantity).toFixed(2) + " $";

  if (fromCart) {
    cart.set(card.id, quantity);
    updateCartCount();
    setLocalStorage();
  }
}

////////////////////////////////////////////////////////////
function setLocalStorage() {
  const keys = Array.from(cart.keys());
  let objCart = [];

  keys.forEach((key) =>
    objCart.push({
      id: key,
      quantity: cart.get(key),
    })
  );
  localStorage.setItem("cart", JSON.stringify(objCart));
  restoreLocalStorage();
}

async function restoreLocalStorage() {
  const objCart = JSON.parse(localStorage.getItem("cart") || "[]");
  if (objCart.length === 0) return;

  let promises = objCart.map(({ id, quantity }) => {
    if (quantity > 0) {
      cart.set(id, quantity);
      return getJSON(`/products/${id}`);
    }
  });

  promises = promises.filter((promise) => promise !== undefined);

  cartProductsDOM.innerHTML = "";
  const results = await Promise.all(promises);
  results.forEach(([product]) => {
    const quantity = cart.get(product.id + "");
    renderProduct(product, true, quantity);
  });
  updateCartCount();
}

///////////////////////////////////////////////////////////
function init() {
  productsDOM.innerHTML = "";
  cartProductsDOM.innerHTML = "";
  inCartNumber.textContent = 0;
  inCartNumber.style.visibility = "hidden";

  restoreLocalStorage();
  fetchStarter();
}
init();
