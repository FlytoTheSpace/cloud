const sideBarButtons = [
    {
        name: "Home",
        redirect: "/cloud",
        icon: `${theme.icon}/home.svg`
    },
    {
        name: "Drive",
        redirect: "/cloud/u/",
        icon: `${theme.icon}/cloud.svg`
    },
    {
        name: "Shared",
        redirect: "/cloud/shared",
        icon: `${theme.icon}/folder_shared.svg`
    },
    {
        name: "Upload",
        redirect: "/cloud/upload",
        icon: `${theme.icon}/upload.svg`
    }
]

const sidebar = document.getElementById('sidebar');
sideBarButtons.forEach(link => {
    sidebar.firstElementChild.insertAdjacentHTML('beforeend', `
        <li onclick="location.href = '${link.redirect}'">
            <img src="/assets/images/icons/${link.icon}" alt="">
            <p class="sidebarLinkText">${link.name}</p>
        </li>
    `)
})