const startBtn = document.getElementById('click');
const page1 = document.getElementById('page1');
const page2 = document.getElementById('page2');
startBtn.addEventListener('click', () => {
    page1.style.display = 'none';
    page2.style.display = 'block';
})


const logoWrapper = document.getElementById('logo-wrapper');
logoWrapper.addEventListener('click', () => {
    page1.style.display = 'block';
    page2.style.display = 'none';
});

const h1 = document.getElementById('h1');
h1.addEventListener('click', () => {
    page1.style.display = 'block';
    page2.style.display = 'none';
});