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
  const id = card.id;
  const quantity = card.querySelector(".quantity").value;

  // control quantity
  if (update) {
    updateCardQuantity(card, update.classList[0]);
    if (!+card.dataset.quantity) {
      removeFromCart(id);
    }
  }
});

////////////////////////////////////////////////////////
async function fetchStarter() {
  const res1 = await fetch(`${API}/products/categories`);
  categories = await res1.json();

  const res2 = await fetch(`${API}/products`);
  allProducts = await res2.json();

  titles = allProducts.map((product) => [product.id, product.title]);
}

async function getJSON(query) {
  const res = await fetch(`${API}${query}`);
  const data = await res.json();
  if (Array.isArray(data)) return data;
  return [data];
}

function suggestions(value, getSuggestions = false) {
  suggestionsContainer.innerHTML = "";

  if (!value || value.length < 2) {
    suggestionsContainer.style.visibility = "hidden";
    return;
  }

  const filteredTitles = titles.filter(([id, title]) =>
    title.toLowerCase().includes(value.toLowerCase())
  );
  if (getSuggestions) return filteredTitles.map(([id, title]) => title);

  // Display suggestions
  filteredTitles.forEach(([id, title]) => {
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

async function generateProductsDOM(products, category) {
  try {
    let productsToRender = [],
      promises = [];
    products.forEach(async (product) => {
      promises.push(getJSON(`/products/${product.id}`));
    });
    promises.push(getJSON(`/products/category/${category}`));
    await Promise.all(promises).then(
      (results) => (productsToRender = results.flat())
    );
    //filter duplicate
    const uniqueProducts = [
      ...new Map(productsToRender.map((item) => [item.id, item])).values(),
    ];

    // update dom
    productsDOM.innerHTML = "";
    uniqueProducts.forEach((product) => renderProduct(product));
  } catch (error) {
    console.error(error);
  }
}

function renderProduct(product, intoCart = false, quantity = 1) {
  const markup = `
          <div class="card" id='${product.id}' data-quantity="${quantity}" data-price="${product.price}">
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
                    value="${quantity}">
                  <button class="increase">+</button>
                </div>

                <h5 class="total-price">${product.price} $</h5>
              </div>
            </div>
          </div>
  `;
  if (!intoCart) productsDOM.insertAdjacentHTML("beforeend", markup);
  else cartProductsDOM.insertAdjacentHTML("afterbegin", markup);
}

async function addToCart(id, quantity) {
  if (Array.from(cart.keys()).includes(id)) {
    updateCartProduct(id, cart.get(id));
    cart.set(id, cart.get(id) + quantity);
  } else {
    const [product] = await getJSON(`/products/${id}`);
    renderProduct(product, true, +quantity);
    inCartNumber.textContent = +inCartNumber.textContent + 1;
    cart.set(id, quantity);
  }
  if (Array.from(!cart.keys()).length)
    inCartNumber.style.visibility = "visible";
  else inCartNumber.style.visibility = "visible";

  setLocalStorage();
}

function removeFromCart(id) {
  cart.delete(id);

  const card = cartProductsDOM.querySelector(`[id='${id}']`);
  cartProductsDOM.removeChild(card);

  inCartNumber.textContent = +inCartNumber.textContent - 1;
  if (!+inCartNumber.textContent) inCartNumber.style.visibility = "hidden";
}

function updateCartProduct(id, quantity) {
  const card = cartProductsDOM.querySelector(`[id='${id}']`);
  card.dataset.quantity = quantity;
  card.querySelector(".quantity").value = quantity;
  card.querySelector(".total-price").textContent =
    +card.dataset.price * quantity + " $";
}

function updateCardQuantity(card, action) {
  const priceEL = card.querySelector(".total-price");
  const quantityEL = card.querySelector(".quantity");
  const ppi = +card.dataset.price;
  if (action === "increase" && card.dataset.quantity < maxQuantity) {
    card.dataset.quantity = +card.dataset.quantity + 1;
    quantityEL.value = +quantityEL.value + 1;
    priceEL.textContent =
      Number((ppi * card.dataset.quantity).toFixed(2)) + " $";
  }
  if (action === "decrease" && card.dataset.quantity > 0) {
    card.dataset.quantity = +card.dataset.quantity - 1;
    quantityEL.value = +quantityEL.value - 1;
    priceEL.textContent =
      Number((ppi * card.dataset.quantity).toFixed(2)) + " $";
  }
  cart.set(card.id, +card.dataset.quantity);
  setLocalStorage();
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
}

async function restoreLocalStorage() {
  const objCart = JSON.parse(localStorage.getItem("cart"));
  let promises = [];
  objCart.forEach(({ id, quantity }) => {
    // reset cart map
    if (quantity) {
      cart.set(id, quantity);
      promises.push(getJSON(`/products/${id}`));
    }
  });

  let products;
  await Promise.all(promises).then((res) => {
    products = res;
  });
  products.forEach(([product]) => {
    const quantity = cart.get(product.id + "");
    // reset cart elements
    renderProduct(product, true, quantity);
  });
  inCartNumber.textContent = promises.length;
  console.log(cart);
  if (+inCartNumber.textContent) inCartDOM.style.visibility = "visible";
}

///////////////////////////////////////////////////////////
function init() {
  productsDOM.innerHTML = "";
  restoreLocalStorage();

  inCartNumber.textContent = 0;
  inCartNumber.style.visibility = "hidden";
  fetchStarter();
}
init();
