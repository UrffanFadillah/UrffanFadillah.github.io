// selectors
let nodeParagraf = document.querySelector(".paragraf");
let nodeAboutMe = document.querySelector(".about-me");
let nodeEducation = document.querySelector(".education");
let nodeDarkMode = document.querySelector(".dark-mode");
let nodeGithub = document.querySelector(".github");
let nodeFooter = document.querySelector(".social-media");

// variables
let aboutMeParagraf = `Halo, perkenalkan nama saya M.Urffan Fadillah, lahir di kota
Tasikmalaya tanggal 22 juli tahun 2002, dan sekarang saya
tinggal di Tasikmalaya. Saya tertarik kepada dunia IT, terutama
pemrograman web dan hobi saya adalah membaca buku, dan bermain
<i>game mobile</i>`;

let educationParagraf = `saya lulus tahun 2020 di sekolah menengah kejuruan 4 di Kota Tasikmalaya dengan mengambil jurusan Rekayasa Perangkat Lunak`;

// do events
nodeParagraf.innerHTML = aboutMeParagraf;

nodeAboutMe.addEventListener("click", () => {
  nodeParagraf.innerHTML = aboutMeParagraf;
});

nodeEducation.addEventListener("click", () => {
  nodeParagraf.innerHTML = educationParagraf;
});

nodeDarkMode.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  nodeGithub.classList.toggle("dark-github");
  nodeFooter.classList.toggle("dark-footer");
  if (document.body.className === "dark") {
    nodeDarkMode.innerHTML = "Mode Terang";
  } else {
    nodeDarkMode.innerHTML = "Mode Gelap";
  }
});
