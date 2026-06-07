const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");
const tabButtons = document.querySelectorAll(".tab-button");
const menuLists = document.querySelectorAll(".menu-list");
const year = document.querySelector("#year");

if (year) {
  year.textContent = new Date().getFullYear();
}

if (menuToggle && navLinks) {
  menuToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });
}

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const category = button.dataset.category;

    tabButtons.forEach((item) => item.classList.remove("active"));
    menuLists.forEach((list) => {
      list.classList.toggle("active", list.dataset.menu === category);
    });

    button.classList.add("active");
  });
});
