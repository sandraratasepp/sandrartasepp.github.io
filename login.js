function base64Encode(str) {
    return btoa(str);
}

function getJwt(username, password) {
    const credentials = base64Encode(`${username}:${password}`);
    
    return fetch('https://01.kood.tech/api/auth/signin', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log('Login response:', data);
        if (typeof data === 'string') {
            Cookies.set('token', data.jwt, { expires: 1/24 });
            document.getElementById('login-page').style.display = 'none';
            document.getElementById('page-container').style.display = 'flex';
        } else {
            document.getElementById('login-error').innerText = 'Incorrect log in details';
        }
    })
    .catch(error => {
        console.error('Login error:', error);
        document.getElementById('login-error').innerText = 'Login failed';
    });
}

document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!username|| !password) {
        console.error('Login details cannot be empty');
        document.getElementById('login-error').innerText = 'Please enter both username and password.';
        return;
    }

    console.log('Logging in with:', { username, password });
    getJwt(username, password);
});