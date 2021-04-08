(async function() {
const syncStatus = document.getElementById("sync-status")
    while ((await github('/gists')).status == 401) {
        alert("Unauthorized or invalid GitHub access token")
        syncStatus.dataset.state = "unauthorized"
        syncStatus.title = "Unauthorized"
        const token = prompt("Setup: GitHub personal token to work with gists")
        window.localStorage.setItem("gh-token", token)
    }
        
    while ((await github(`/gists/${localStorage.getItem("gh-gist")}`)).status !== 200) {
        alert("Gist not found or not defined")
        const gistID = prompt("Setup: gist where I will store the information")
        window.localStorage.setItem("gh-gist", gistID)
    }
    await sync()
    document.getElementById("sync-status").addEventListener('click', sync)
})()

function useSerial(fn) {
    let running = false
    return function(...args) {
        if (running) {
            alert("Error: can't run this action more than once in the same time")
            return
        }
        running = true
        Promise.resolve(fn(...args)).finally(() => {
            running = false
        })
    }
}

const sync = useSerial(async function sync() {
    const syncStatus = document.getElementById("sync-status")
    syncStatus.dataset.state = "syncing"
    syncStatus.title = "Synchronizing"
    try {
        let data = {}
        storeState()
        function processItem(item) {
            const {
                id,
                due,
                body,
                is_done,
                mod_time
            } = item
            const fileData = {
                id,
                due: parseInt(due),
                body,
                is_done: parseBoolean(is_done),
                mod_time: parseInt(mod_time)
            }
            if (isNaN(fileData.due)) {
                console.log(`SYNC: '${file}' element have a due element that is not a integer ('${due}')`)
                return
            }
            if (data[id] !== undefined) {
                console.log(`SYNC: element with id ${id} merged with element from remote`)
                if (!data[id].mod_time) {
                    data[id].mod_time = 0
                }
                if (!fileData.mod_time) {
                    fileData.mod_time = 0
                }
                if (data[id].mod_time > fileData.mod_time) {
                    data[id] = {...fileData, ...data[id]}
                } else {
                    data[id] = {...data[id], ...fileData}
                }
                return
            } else {
                data[id] = fileData
            }
        }
        function processFile (file) {
            if (file === undefined) {
                return
            }
            const {
                content,
                filename,
                language,
                type
            } = file
            if (type !== "application/json" || language !== "JSON") {
                console.log(`SYNC: '${filename}' is not a JSON, skipping`)
                return
            }
            try {
                const jsonContent = JSON.parse(content)
                if (Array.isArray(jsonContent)) {
                    jsonContent.forEach(processItem)
                } else {
                    console.log(`SYNC: '${filename}' is a valid JSON but root object is not an array`)
                }
            } catch (e) {
                console.log(`SYNC: '${filename}' is a invalid JSON, full error is below`)
                console.error(e)
                return
            }
        }
        
        const gistData = await (await github(`/gists/${localStorage.getItem("gh-gist")}`)).json()
        console.log(gistData)
        let {files} = gistData
        // Precedence rules
        if (true) { // TODO: Should I skip archive.json 
            files["archive.json"] = undefined
        }
        // End precedence rules
        Object.values(files).forEach(processFile)
        const localData = JSON.parse(localStorage.getItem("items"))
        if (Array.isArray(localData)) {
            localData.forEach(processItem)
        }
        console.log(data)
        const newContent = JSON.stringify(Object.values(data), null, 2)
        const oldContent = gistData.files["data.json"].content
        if (newContent != oldContent) {
            const res = await github(`/gists/${localStorage.getItem("gh-gist")}`, {
                files: {
                    "data.json": {
                        content: newContent
                    }
                }
            }, "PATCH")
            console.log(res)
        } else {
            console.log("content is the same, skipping...")
        }
        renderItems(Object.values(data))
        syncStatus.dataset.state = "synchronized"
        syncStatus.title = "Synchronization success"
    } catch (e) {
        syncStatus.dataset.state = "error"
        syncStatus.title = "Synchronization error"
        console.error(e)
    }
})

async function github(path, payload, method = "GET") {
    const req = new Request(`https://api.github.com${path}`, {
        method,
        headers: {
            "Accept": "application/vnd.github.v3+json",
            "Authorization": `Bearer ${localStorage.getItem("gh-token")}`
        },
        body: JSON.stringify(payload)
    })
    return await fetch(req)
}

function useInactivity(fn, ms = 1000) {
    let timeout = setTimeout(fn, ms)
    const callback = () => {
        fn()
        handleMovement()
    }
    function handleMovement() {
        console.log("movement")
        clearTimeout(timeout)
        timeout = setTimeout(callback, ms)
    }
    window.addEventListener('mousemove', handleMovement)
    window.addEventListener('mousedown', handleMovement)
    window.addEventListener('keypress', handleMovement)
    window.addEventListener('touchmove', handleMovement)
}

useInactivity(sync, 10000)