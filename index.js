function getCurrentTime() {
    return Math.floor(new Date().getTime()/1000.0)
}

function remainingTimeFormatter(time) {
    let units = time
    if (Math.abs(units) <= 60) {
        return `${units}s`
    }
    units = Math.floor(units/60)
    if (Math.abs(units) <= 60) {
        return `${units}m`
    }
    units = Math.floor(units/60)
    if (Math.abs(units) <= 24) {
        return `${units}h`
    }
    units = Math.floor(units/24)
    if (Math.abs(units) <= 7) {
        return `${units}d`
    }
    units = Math.floor(units/7)
    if (Math.abs(units) <= 7) {
        return `${units}w`
    }
    units = Math.floor(units/4)
    if (Math.abs(units) <= 7) {
        return `${units}M`
    }
    units = Math.floor(units/12)
    return `${units}Y`
}

function stateToHTML(state) {
    let ret = document.createElement("div")
    function bumpModtime() {
        ret.dataset["mod_time"] = getCurrentTime()
    }
    ret.className = "item "
    Object.keys(state).forEach((key) => {
        ret.dataset[key] = state[key]
    })
    if (!ret.dataset["mod_time"]) {
        bumpModtime()
    }
    const tickButton = document.createElement("div")
    tickButton.innerText = remainingTimeFormatter(state.due - getCurrentTime())
    tickButton.addEventListener('click', () => {
        console.log("ticking todo item")
        ret.dataset.is_done = !parseBoolean(ret.dataset.is_done)
        bumpModtime()
    })
    if (tickButton.innerText[0] == '-') { // remove trailing -
        tickButton.innerText = tickButton.innerText.slice(1)
        tickButton.style.color = "red"
    }
    tickButton.className = "tick"
    ret.appendChild(tickButton)
    const body = document.createElement("div")
    body.className = "todo-body"
    body.innerHTML = state.body
    body.contentEditable = true
    body.addEventListener('change', () => {
        console.log("change")
        bumpModtime()
    })
    ret.appendChild(body)
    return ret
}

function generateRandomID() {
    const uint32 = window.crypto.getRandomValues(new Uint32Array(1))[0]
    return uint32.toString(16)
}

function submitTask(e) {
    const body = document.getElementById("task-input").innerHTML
    const due = Date.parse(document.getElementById("task-due").value)/1000
    if (isNaN(due)) {
        alert("Missing task deadline")
        return
    }
    const id = generateRandomID()
    document.getElementById("tasks").appendChild(
        stateToHTML({
            id,
            body,
            is_done: false,
            due
        })
    )
}

document.getElementById("task-form").addEventListener('submit', submitTask)

function parseBoolean(value) {
    const strvalue = String(value)
    if (strvalue.toLowerCase() == "true") {
        return true
    } else {
        return false
    }
}

function extractStates() {
    const tasks = document.getElementById("tasks")
    let states = []
    for (const e of tasks.children) {
        const {
            id,
            body,
            is_done,
            due,
            mod_time
        } = e.dataset
        states.push({
            id,
            body,
            is_done: parseBoolean(is_done),
            due: parseInt(due),
            mod_time: parseInt(mod_time)
        })
    }
    return states
}

function storeState() {
    console.log("saving state locally")
    localStorage.setItem("items", JSON.stringify(extractStates()))
}

window.onbeforeunload = storeState;

function renderItems(items = JSON.parse(localStorage.getItem("items"))) {
    try {
        const node = document.getElementById("tasks")
        node.innerHTML = ""
        items.map(stateToHTML).forEach((e) => {
            node.appendChild(e)
        })
    } catch (e) {
        console.error(e)
    }
}
renderItems()