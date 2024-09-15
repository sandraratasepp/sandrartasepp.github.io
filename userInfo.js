const graphqlEndpoint = 'https://01.kood.tech/api/graphql-engine/v1/graphql';

export function loadUserProfile() {
    const jwtToken = Cookies.get('jwtToken');
    if (!jwtToken) {
        document.getElementById('login-error').innerText = 'Please login again';
        return;
    }

    const userInfoQuery = `
    query {
        user {
            id
            login
            createdAt
            email
            firstName
            lastName
        }
    }`;

    fetch(graphqlEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({ query: userInfoQuery })
    })
    .then(response => response.json())
    .then(data => {
        console.log('User profile data:', data);
        if (data && data.data && data.data.user && data.data.user.length > 0) {
            const user = data.data.user[0];

            document.querySelector('#welcome-message').innerText = `Hello ${user.firstName}! 👋🏻`;
            document.querySelector('#profile #full-name').innerText = `${user.firstName} ${user.lastName}`;
            document.querySelector('#profile #username').innerText = `👥 ${user.login}`;
            document.querySelector('#profile #email').innerText = `${user.email}`;
            document.querySelector('#profile #created-at').innerText = `🎂 ${new Date(user.createdAt).toLocaleDateString()}`;

            // Load transactions and top projects after fetching user profile
            loadTransactionTable();
            loadTopProjectsData();
        } else {
            document.getElementById('login-error').innerText = 'Failed to load profile data';
        }
    })
    .catch(error => {
        console.error('Profile fetch error:', error);
        document.getElementById('login-error').innerText = 'Error loading profile data';
    });
}

function loadTransactionTable() {
    const jwtToken = Cookies.get('jwtToken');
    if (!jwtToken) return;

    const transactionQuery = `
    query {
        transaction(where: { type: { _eq: "xp" }, createdAt: { _gte: "2024-01-01T00:00:00+00:00" } }) {
            id
            type
            amount
            createdAt
        }
    }`;

    fetch(graphqlEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({ query: transactionQuery })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Transaction data:', data);
        if (data && data.data && data.data.transaction) {
            const transactions = data.data.transaction;
            const xpDataByMonth = d3.rollup(
                transactions,
                v => d3.sum(v, d => d.amount),
                d => d3.timeMonth(d3.isoParse(d.createdAt))
            );
            const xpData = Array.from(xpDataByMonth, ([date, amount]) => ({ date, amount }));
            renderBarChart(xpData);
        } else {
            console.error('Failed to load transaction data');
        }
    })
    .catch(error => {
        console.error('Transaction fetch error:', error);
    });
}

function renderBarChart(xpData) {
    const margin = { top: 20, right: 30, bottom: 40, left: 80 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    d3.select("#chartContainer").selectAll("*").remove();

    const svg = d3.select("#chartContainer")
                  .append("svg")
                  .attr("width", width + margin.left + margin.right)
                  .attr("height", height + margin.top + margin.bottom)
                  .append("g")
                  .attr("transform", `translate(${margin.left},${margin.top})`);
    
    const x = d3.scaleBand()
                .domain(xpData.map(d => d3.timeFormat("%B %Y")(d.date)))
                .range([0, width])
                .padding(0.3);

    const y = d3.scaleLinear()
                .domain([0, d3.max(xpData, d => d.amount)])
                .nice()
                .range([height, 0]);


    svg.append("g")
       .attr("transform", `translate(0,${height})`)
       .call(d3.axisBottom(x).tickSize(0));

    svg.append("g")
       .call(d3.axisLeft(y).tickFormat(d3.format(",d")));

    svg.selectAll(".bar")
       .data(xpData)
       .enter().append("rect")
       .attr("class", "bar")
       .attr("x", d => x(d3.timeFormat("%B %Y")(d.date)))
       .attr("y", d => y(d.amount))
       .attr("width", x.bandwidth())
       .attr("height", d => height - y(d.amount))
       .attr("fill", "#e6c6fa")
       .on("mouseover", function(event, d) {
           d3.select(this).attr("fill", "#9676aa");
       })
       .on("mouseout", function(event, d) {
           d3.select(this).attr("fill", "#e6c6fa"); 
       });

    svg.selectAll(".text")
       .data(xpData)
       .enter().append("text")
       .attr("x", d => x(d3.timeFormat("%B %Y")(d.date)) + x.bandwidth() / 2)
       .attr("y", d => y(d.amount) - 5)
       .attr("text-anchor", "middle")
       .attr("fill", "white")
       .text(d => d.amount);
}

function loadTopProjectsData() {
    const jwtToken = Cookies.get('jwtToken');
    if (!jwtToken) return;

    const xpByProjectQuery = `
    query {
        transaction(where: { type: { _eq: "xp" } }) {
            id
            amount
            objectId
            object {
                name
            }
        }
    }`;

    fetch(graphqlEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({ query: xpByProjectQuery })
    })
    .then(response => response.json())
    .then(data => {
        console.log('XP by project data:', data);
        if (data && data.data && data.data.transaction) {
            const transactions = data.data.transaction;
            const xpByProject = d3.rollup(
                transactions,
                v => d3.sum(v, d => d.amount),
                d => d.object.name
            );
            let xpData = Array.from(xpByProject, ([projectName, amount]) => ({ projectName, amount }));
            
            // Sort by amount in descending order and take the top 5
            xpData = xpData.sort((a, b) => b.amount - a.amount).slice(0, 5);

            // Render the top 5 projects as boxes
            renderTopProjectsBoxes(xpData);
        } else {
            console.error('Failed to load XP by project data');
        }
    })
    .catch(error => {
        console.error('XP by project fetch error:', error);
    });
}


function renderTopProjectsBoxes(xpData) {
    const container = document.getElementById("topProjectsContainer");
    
    // Remove any previous boxes before rendering new ones
    container.innerHTML = '';

    // Define box styles
    const boxStyle = `
        border: 1px solid #e6c6fa;
        padding: 10px;
        margin: 10px 0;
        border-radius: 5px;
        background-color: #3a3a3a;
        color: white;
        font-size: 16px;
    `;

    xpData.forEach((project, index) => {
        const projectBox = document.createElement("div");
        projectBox.style.cssText = boxStyle;
        projectBox.innerText = `${index + 1}. ${project.projectName} | XP Earned: ${project.amount}`;
        container.appendChild(projectBox);
    });
}


