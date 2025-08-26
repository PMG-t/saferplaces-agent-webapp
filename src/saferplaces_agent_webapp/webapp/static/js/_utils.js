const GEOM_TYPES = {
    POINT: 1,
    LINESTRING: 2,
    POLYGON: 3
}

function s3uri_to_https(s3_uri) {
    return s3_uri.replace('s3://', 'https://s3.us-east-1.amazonaws.com/')
}

function createEl(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);

    for (const [key, value] of Object.entries(attrs)) {
        if (key === 'class') {
            el.className = value;
        } else if (key === 'text') {
            el.textContent = value;
        } else if (key === 'html') {
            el.innerHTML = value;
        } else if (key === 'dataset' && typeof value === 'object') {
            // supporto per dataset: { userId: "123", role: "admin" }
            for (const [dataKey, dataVal] of Object.entries(value)) {
                el.dataset[dataKey] = dataVal;
            }
        } else {
            el.setAttribute(key, value);
        }
    }

    children.forEach(child => el.appendChild(child));
    
    return el;
}

function justext(path) {
    return path.split('.').pop();
}

function justfilename(path) {
    return path.split(/(\\|\/)/g).pop()
}
