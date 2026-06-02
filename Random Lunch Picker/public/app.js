let restaurants = [];
let isSpinning = false;

const slot = document.getElementById('slot');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const resultDiv = document.getElementById('result');
const resultName = document.getElementById('resultName');
const resultCuisine = document.getElementById('resultCuisine');
const resultRating = document.getElementById('resultRating');
const resultPrice = document.getElementById('resultPrice');
const addRestaurantBtn = document.getElementById('addRestaurantBtn');
const addForm = document.getElementById('addForm');
const restaurantForm = document.getElementById('restaurantForm');
const cancelBtn = document.getElementById('cancelBtn');

async function loadRestaurants() {
  try {
    const response = await fetch('/api/restaurants');
    restaurants = await response.json();
  } catch (error) {
    console.error('加载餐厅数据失败:', error);
  }
}

function getRandomRestaurant() {
  return restaurants[Math.floor(Math.random() * restaurants.length)];
}

function startSpin() {
  if (isSpinning || restaurants.length === 0) return;
  
  isSpinning = true;
  startBtn.disabled = true;
  resultDiv.style.display = 'none';
  
  let speed = 50;
  let iterations = 0;
  const maxIterations = 30;
  
  const spinInterval = setInterval(() => {
    const randomRestaurant = getRandomRestaurant();
    slot.innerHTML = `<div class="item">${randomRestaurant.name}</div>`;
    iterations++;
    
    if (iterations >= maxIterations - 5) {
      speed += 100;
      clearInterval(spinInterval);
      
      const finalSpeed = setInterval(() => {
        const randomRestaurant = getRandomRestaurant();
        slot.innerHTML = `<div class="item">${randomRestaurant.name}</div>`;
      }, speed);
      
      setTimeout(() => {
        clearInterval(finalSpeed);
        showResult();
      }, 800);
    }
  }, speed);
}

function showResult() {
  const selected = getRandomRestaurant();
  slot.innerHTML = `<div class="item">${selected.name}</div>`;
  
  setTimeout(() => {
    resultName.textContent = selected.name;
    resultCuisine.textContent = selected.cuisine;
    resultRating.textContent = `⭐ ${selected.rating}`;
    resultPrice.textContent = selected.price_range;
    resultDiv.style.display = 'block';
    
    startBtn.style.display = 'none';
    restartBtn.style.display = 'inline-block';
    isSpinning = false;
  }, 300);
}

function reset() {
  resultDiv.style.display = 'none';
  slot.innerHTML = `<div class="item">点击下方按钮开始抽取</div>`;
  startBtn.style.display = 'inline-block';
  restartBtn.style.display = 'none';
  startBtn.disabled = false;
  isSpinning = false;
}

function toggleAddForm() {
  if (addForm.style.display === 'none' || !addForm.style.display) {
    addForm.style.display = 'block';
  } else {
    addForm.style.display = 'none';
    restaurantForm.reset();
  }
}

async function addRestaurant(event) {
  event.preventDefault();
  
  const name = document.getElementById('restaurantName').value;
  const cuisine = document.getElementById('restaurantCuisine').value;
  const rating = document.getElementById('restaurantRating').value;
  const price_range = document.getElementById('restaurantPrice').value;
  
  try {
    const response = await fetch('/api/restaurants', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, cuisine, rating, price_range })
    });
    
    if (response.ok) {
      const data = await response.json();
      restaurants.push(data.restaurant);
      alert(`餐厅「${data.restaurant.name}」添加成功！`);
      toggleAddForm();
      restaurantForm.reset();
    } else {
      const errorData = await response.json();
      alert(errorData.error || '添加餐厅失败');
    }
  } catch (error) {
    console.error('添加餐厅失败:', error);
    alert('添加餐厅失败，请稍后再试');
  }
}

startBtn.addEventListener('click', startSpin);
restartBtn.addEventListener('click', () => {
  reset();
  startSpin();
});
addRestaurantBtn.addEventListener('click', toggleAddForm);
cancelBtn.addEventListener('click', toggleAddForm);
restaurantForm.addEventListener('submit', addRestaurant);

loadRestaurants();
