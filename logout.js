document.getElementById('logout').addEventListener('click', function() {
    logoutHandler();
});

function logoutHandler () {
    Cookies.remove('jwtToken');
    document.getElementById('page-container').style.display = 'none';
    document.getElementById('login-page').style.display = 'flex';

    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}