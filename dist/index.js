"use strict";
var ProjectStatus;
(function (ProjectStatus) {
    ProjectStatus[ProjectStatus["active"] = 0] = "active";
    ProjectStatus[ProjectStatus["finished"] = 1] = "finished";
})(ProjectStatus || (ProjectStatus = {}));
//create enum with selected and not selected
var ProjectSelected;
(function (ProjectSelected) {
    ProjectSelected[ProjectSelected["notSelected"] = 0] = "notSelected";
    ProjectSelected[ProjectSelected["selected"] = 1] = "selected";
})(ProjectSelected || (ProjectSelected = {}));
class Project {
    constructor(id, title, description, people, status, selected) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.people = people;
        this.status = status;
        this.selected = selected;
    }
}
class ListenerState {
    constructor() {
        this.listeners = [];
    }
    addListener(listenerFn) {
        this.listeners.push(listenerFn);
    }
}
class Item {
    constructor(data, index, selected = ProjectSelected.notSelected, status = ProjectStatus.active) {
        this.data = data;
        this.id = new Date().getTime().toString();
        this.id += index;
        this.selected = selected;
        this.status = status;
    }
    changeSelect() {
        this.selected = this.selected === ProjectSelected.selected ? ProjectSelected.notSelected : ProjectSelected.selected;
    }
}
class State extends ListenerState {
    constructor() {
        super();
        this.projects = [];
    }
    static getInstance() {
        if (this.instance)
            return this.instance;
        this.instance = new State();
        return this.instance;
    }
    addProject(data) {
        const newProject = new Item(data, this.projects.length - 1);
        this.projects.push(newProject);
        this.updateListeners();
    }
    moveProject(projectId, newStatus) {
        const project = this.projects.find(prj => prj.id === projectId);
        if (project && project.status !== newStatus) {
            project.status = newStatus;
            project.selected = ProjectSelected.notSelected;
            this.updateListeners();
        }
    }
    getList() {
        return this.projects;
    }
    updateListeners() {
        for (const listenerFn of this.listeners) {
            listenerFn(this.projects.slice());
        }
    }
    selectProject(projectId) {
        this.projects = this.projects.map(prj => {
            if (prj.id === projectId) {
                if (prj && prj.selected !== ProjectSelected.selected) {
                    prj.selected = ProjectSelected.selected;
                }
                else if (prj && prj.selected !== ProjectSelected.notSelected) {
                    prj.selected = ProjectSelected.notSelected;
                }
            }
            return prj;
        });
        this.updateListeners();
    }
}
const prjState = State.getInstance();
// Component Base Class
class Component {
    constructor(templateId, renderElemId, insertAtStart, newElemId) {
        this.templateElem = document.getElementById(templateId);
        this.renderElem = document.getElementById(renderElemId);
        const importedNode = document.importNode(this.templateElem.content, true);
        this.element = importedNode.firstElementChild;
        if (newElemId)
            this.element.id = newElemId;
        this.attach(insertAtStart);
    }
    attach(insert) {
        this.renderElem.insertAdjacentElement(insert ? 'afterbegin' : 'beforeend', this.element);
    }
}
class ItemRender extends Component {
    // get persons() {
    //     return this.project.people === 1 ? '1 person' : `${this.project.people} persons`;
    // }
    constructor(hostId, project, arrayLabel) {
        super(hostId === 'list-responsive' ? 'single-responsive' : 'single', hostId, false, hostId === "list-responsive" ? `item-responsive-${project.id}` : `item-${project.id}`);
        this.dragStartHandler = (event) => {
            event.dataTransfer.setData('text/plain', this.project.id);
            event.dataTransfer.effectAllowed = 'move';
        };
        this.dragEndHandler = (_) => {
        };
        this.clickSelectedHandler = (event) => {
            //get project id
            if (this.isResponsive) {
                // change direct sans passer par select
                this.project.status = this.project.status === ProjectStatus.finished ? ProjectStatus.active : ProjectStatus.finished;
            }
            else {
                prjState.selectProject(this.project.id);
            }
            this.contentRender();
        };
        this.project = project;
        this.isResponsive = hostId === 'list-responsive';
        this.arrayLabel = arrayLabel;
        this.configure();
        this.contentRender();
    }
    configure() {
        this.element.addEventListener('dragstart', this.dragStartHandler);
        this.element.addEventListener('dragend', this.dragEndHandler);
        this.element.addEventListener('click', this.clickSelectedHandler);
    }
    contentRender() {
        this.arrayLabel.forEach((item) => {
            let valueText = "";
            let [valeur, classValeur] = item;
            Object.entries(this.project.data).forEach(([key, value]) => {
                if (key === valeur) {
                    valueText = value;
                }
            });
            const itemElem = this.element.querySelector(`.${classValeur}`);
            itemElem.innerText = valueText;
        });
    }
}
class List extends Component {
    constructor(type, selected, arrayLabel) {
        super('list', 'app', false, `${type}-projects`);
        this.type = type;
        this.selected = selected;
        this.isResponsive = false;
        this.widthResponsive = 450;
        this.dragOverHandler = (event) => {
            if (event.dataTransfer && event.dataTransfer.types[0] === 'text/plain') {
                event.preventDefault();
                const listEl = this.element.querySelector('ul');
                listEl.classList.add('droppable');
            }
        };
        this.dropHandler = (event) => {
            const prjId = event.dataTransfer.getData('text/plain');
            prjState.moveProject(prjId, this.type === 'active' ? ProjectStatus.active : ProjectStatus.finished);
        };
        this.dragLeaveHandler = (_) => {
            const listEl = this.element.querySelector('ul');
            listEl.classList.remove('droppable');
        };
        this.clickHandler = (event) => {
            if (this.type === 'active') {
                //get all active projects
                const activeProjects = this.isResponsive ? prjState.projects : prjState.projects.filter(prj => prj.status === ProjectStatus.active);
                //display all active projects
                this.assignedProjects = activeProjects;
                for (const project of activeProjects) {
                    project.status = ProjectStatus.finished;
                    project.selected = ProjectSelected.notSelected;
                }
                prjState.updateListeners();
                this.projectsRender();
            }
            else {
                //get all finished projects
                const finishedProjects = prjState.projects.filter(prj => prj.status === ProjectStatus.finished);
                //display all finished projects
                this.assignedProjects = finishedProjects;
                for (const project of finishedProjects) {
                    project.status = ProjectStatus.active;
                    project.selected = ProjectSelected.notSelected;
                }
                prjState.updateListeners();
                this.projectsRender();
            }
        };
        this.changeSelectedHandler = (event) => {
            const selectedProjects = prjState.projects.filter(prj => prj.selected === ProjectSelected.selected);
            this.assignedProjects = selectedProjects;
            //change status of all selected projects
            for (const project of selectedProjects) {
                if (this.type === 'active') {
                    project.status = ProjectStatus.finished;
                    project.selected = ProjectSelected.notSelected;
                }
                else {
                    project.status = ProjectStatus.active;
                    project.selected = ProjectSelected.notSelected;
                }
            }
            prjState.updateListeners();
            this.projectsRender();
        };
        this.assignedProjects = [];
        this.arrayLabel = arrayLabel;
        this.configure();
        this.contentRender();
    }
    configure() {
        this.element.addEventListener('dragover', this.dragOverHandler);
        this.element.addEventListener('dragleave', this.dragLeaveHandler);
        this.element.addEventListener('drop', this.dropHandler);
        this.isResponsive = this.widthResponsive >= window.innerWidth;
        prjState.addListener((projects) => {
            const relevantProjects = projects.filter(prj => this.type === 'active' ?
                prj.status === ProjectStatus.active :
                prj.status === ProjectStatus.finished);
            this.assignedProjects = relevantProjects;
            this.projectsRender();
        });
        window.addEventListener('resize', (e) => {
            let res = this.widthResponsive >= window.innerWidth;
            if (this.isResponsive !== res) {
                this.isResponsive = res;
                this.assignedProjects = this.isResponsive ? prjState.projects : prjState.projects.filter(prj => this.type === 'active' ?
                    prj.status === ProjectStatus.active :
                    prj.status === ProjectStatus.finished);
                this.contentRender();
            }
        });
    }
    contentRender() {
        const listId = this.isResponsive && this.type === 'active' ? 'list-responsive' : `${this.type}-projects-list`;
        this.element.querySelector('ul').id = listId;
        this.element.querySelector('h2').innerText = `PROJECTS`;
        if (!this.isResponsive) {
            this.element.querySelector('h2').innerText = `${this.type.toUpperCase()} PROJECTS`;
            if (this.type === 'active') {
                this.element.querySelector('.button1').classList.remove('hidden');
                this.element.querySelector('.button2').classList.remove('hidden');
                this.element.querySelector('.button1').innerHTML = `<img src="fleche-vers-le-bas%20(1).png" width="2%" height="10%">`;
                this.element.querySelector('.button2').innerHTML = `<img src="fleche-vers-le-bas.png" width="2%" height="10%"> `;
                this.element.querySelector('.button1').addEventListener('click', this.clickHandler);
            }
            else {
                this.element.classList.remove('hidden');
                this.element.querySelector('.button1').innerHTML = `<img src="fleches-vers-le-haut.png" width="2%" height="10%">`;
                this.element.querySelector('.button2').innerHTML = `<img src="angle-de-la-fleche-vers-le-haut.png" width="2%" height="10%">`;
                this.element.querySelector('.button1').addEventListener('click', this.clickHandler);
            }
        }
        else {
            if (this.type === 'active') {
                this.element.querySelector('.button1').classList.add('hidden');
                this.element.querySelector('.button2').classList.add('hidden');
            }
            else {
                this.element.classList.add('hidden');
            }
            this.element.querySelector('.button1').classList.add('hidden');
            this.element.querySelector('.button1').addEventListener('click', this.clickHandler);
        }
        if (this.type === 'active') {
            this.element.querySelector('.button1').innerHTML = `>>`;
            this.element.querySelector('.button2').innerHTML = `>`;
            this.element.querySelector('.button1').addEventListener('click', this.clickHandler);
            this.element.querySelector('.button2').addEventListener('click', this.changeSelectedHandler);
        }
        else {
            this.element.querySelector('.button1').innerHTML = `<<`;
            this.element.querySelector('.button2').innerHTML = `<`;
            this.element.querySelector('.button1').addEventListener('click', this.clickHandler);
            this.element.querySelector('.button2').addEventListener('click', this.changeSelectedHandler);
        }
        this.projectsRender();
    }
    projectsRender() {
        let stringElement = !this.isResponsive ? `${this.type}-projects-list` : `list-responsive`;
        const listEl = document.getElementById(stringElement);
        listEl.innerHTML = '';
        for (const prjItem of this.assignedProjects) {
            // itemResponsive checkbox
            // item selected
            new ItemRender(stringElement, prjItem, arrayLabel);
        }
    }
}
let arrayLabel = [
    ["title", "title"],
    ["description", "desc"],
    ["people", "people"],
];
// const projInput = new Input();
const activeList = new List('active', 0, arrayLabel);
const finishedList = new List('finished', 0, arrayLabel);
class ProjectTest {
    constructor(id, title, description, people) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.people = people;
    }
}
for (let i = 0; i < 4; i++) {
    prjState.addProject(new ProjectTest(i, "test" + i, "soup" + i, i + 5));
}
