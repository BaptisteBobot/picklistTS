"use strict";
var ProjectStatus;
(function (ProjectStatus) {
    ProjectStatus[ProjectStatus["Active"] = 0] = "Active";
    ProjectStatus[ProjectStatus["Finished"] = 1] = "Finished";
})(ProjectStatus || (ProjectStatus = {}));
class Project {
    constructor(id, title, description, people, status) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.people = people;
        this.status = status;
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
    addProject(title, desc, nums) {
        const newProject = new Project(Math.random().toString(), title, desc, nums, ProjectStatus.Active);
        this.projects.push(newProject);
        this.updateListeners();
    }
    moveProject(projectId, newStatus) {
        const project = this.projects.find(prj => prj.id === projectId);
        if (project && project.status !== newStatus) {
            project.status = newStatus;
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
class Item extends Component {
    constructor(hostId, project) {
        super('single', hostId, false, project.id);
        this.dragStartHandler = (event) => {
            event.dataTransfer.setData('text/plain', this.project.id);
            event.dataTransfer.effectAllowed = 'move';
        };
        this.dragEndHandler = (_) => {
            console.log('DragEnd');
        };
        this.project = project;
        this.configure();
        this.contentRender();
    }
    get persons() {
        return this.project.people === 1 ? '1 person' : `${this.project.people} persons`;
    }
    configure() {
        this.element.addEventListener('dragstart', this.dragStartHandler);
        this.element.addEventListener('dragend', this.dragEndHandler);
    }
    contentRender() {
        this.element.querySelector('h2').innerText = this.project.title;
        this.element.querySelector('h3').innerText = this.persons + ' assigned';
        this.element.querySelector('p').innerText = this.project.description;
    }
}
class List extends Component {
    constructor(type) {
        super('list', 'app', false, `${type}-projects`);
        this.type = type;
        this.isResponsive = false;
        this.widthResponsive = 450;
        this.arrayData = [];
        this.arrayDataFiltered = [];
        this.dragOverHandler = (event) => {
            if (event.dataTransfer && event.dataTransfer.types[0] === 'text/plain') {
                event.preventDefault();
                const listEl = this.element.querySelector('ul');
                listEl.classList.add('droppable');
            }
        };
        this.dropHandler = (event) => {
            const prjId = event.dataTransfer.getData('text/plain');
            prjState.moveProject(prjId, this.type === 'active' ? ProjectStatus.Active : ProjectStatus.Finished);
        };
        this.dragLeaveHandler = (_) => {
            const listEl = this.element.querySelector('ul');
            listEl.classList.remove('droppable');
        };
        this.clickHandler = (event) => {
            if (this.type === 'active') {
                //get all active projects
                const activeProjects = prjState.projects.filter(prj => prj.status === ProjectStatus.Active);
                //display all active projects
                this.assignedProjects = activeProjects;
                for (const project of activeProjects) {
                    project.status = ProjectStatus.Finished;
                }
                prjState.updateListeners();
                this.projectsRender();
            }
            else {
                //get all finished projects
                const finishedProjects = prjState.projects.filter(prj => prj.status === ProjectStatus.Finished);
                //display all finished projects
                this.assignedProjects = finishedProjects;
                for (const project of finishedProjects) {
                    project.status = ProjectStatus.Active;
                }
                prjState.updateListeners();
                this.projectsRender();
            }
        };
        this.assignedProjects = [];
        this.configure();
        this.contentRender();
    }
    configure() {
        this.element.addEventListener('dragover', this.dragOverHandler);
        this.element.addEventListener('dragleave', this.dragLeaveHandler);
        this.element.addEventListener('drop', this.dropHandler);
        this.isResponsive = this.widthResponsive >= window.innerWidth;
        prjState.addListener((projects) => {
            const relevantProjects = projects.filter(prj => this.type === 'active' ? prj.status === ProjectStatus.Active : prj.status === ProjectStatus.Finished);
            this.assignedProjects = relevantProjects;
            this.projectsRender();
        });
        window.addEventListener('resize', (e) => {
            let res = this.widthResponsive >= window.innerWidth;
            if (this.isResponsive !== res) {
                this.isResponsive = res;
                this.arrayData = this.isResponsive ? prjState.getList() : prjState.getList().filter((item) => this.type === 'active' ? !item.selected : item.selected);
                this.arrayDataFiltered = this.arrayData;
                this.contentRender();
            }
        });
    }
    contentRender() {
        const listId = `${this.type}-projects-list`;
        this.element.querySelector('ul').id = listId;
        this.element.querySelector('h2').innerText = `${this.type.toUpperCase()} PROJECTS`;
        console.log(this.type);
        if (!this.isResponsive) {
            if (this.type === 'active') {
                this.element.querySelector('#div1').classList.remove('hidden');
                this.element.querySelector('#div2').classList.remove('hidden');
                this.element.querySelector('#div1').innerHTML = `<img src="fleche-vers-le-bas%20(1).png" width="2%" height="10%">`;
                this.element.querySelector('#div2').innerHTML = `<img src="fleche-vers-le-bas.png" width="2%" height="10%"> `;
                this.element.querySelector('#div1').addEventListener('click', this.clickHandler);
            }
            else {
                this.element.classList.remove('hidden');
                this.element.querySelector('#div1').innerHTML = `<img src="fleches-vers-le-haut.png" width="2%" height="10%">`;
                this.element.querySelector('#div2').innerHTML = `<img src="angle-de-la-fleche-vers-le-haut.png" width="2%" height="10%">`;
            }
        }
        else {
            if (this.type === 'active') {
                this.element.querySelector('#div1').classList.add('hidden');
                this.element.querySelector('#div2').classList.add('hidden');
            }
            else {
                this.element.classList.add('hidden');
            }
            this.element.querySelector('#div1').classList.add('hidden');
            this.element.querySelector('#div1').addEventListener('click', this.clickHandler);
        }
    }
    projectsRender() {
        const listEl = document.getElementById(`${this.type}-projects-list`);
        listEl.innerHTML = '';
        for (const prjItem of this.assignedProjects) {
            // itemResponsive checkbox
            // item selected
            new Item(this.element.querySelector('ul').id, prjItem);
        }
    }
}
class Input extends Component {
    constructor() {
        super('project', 'app', true, 'user-input');
        this.titleElem = this.element.querySelector('#title');
        this.descElem = this.element.querySelector('#description');
        this.peopleElem = this.element.querySelector('#people');
        this.configure();
    }
    configure() {
        this.element.addEventListener('submit', e => {
            e.preventDefault();
            let userInput = [this.titleElem.value, this.descElem.value, +this.peopleElem.value];
            const [title, desc, people] = userInput;
            prjState.addProject(title, desc, people);
            this.titleElem.value = '';
            this.descElem.value = '';
            this.peopleElem.value = '';
        });
    }
    contentRender() {
    }
}
const projInput = new Input();
const activeList = new List('active');
const finishedList = new List('finished');
