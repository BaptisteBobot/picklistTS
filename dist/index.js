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
        const newProject = new Project(Math.random().toString(), title, desc, nums, ProjectStatus.active, ProjectSelected.notSelected);
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
            console.log(prj.id, projectId);
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
        console.log(this.projects);
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
        this.clickSelectedHandler = (event) => {
            //get project id
            prjState.selectProject(this.project.id);
            this.contentRender();
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
        this.element.addEventListener('click', this.clickSelectedHandler);
    }
    contentRender() {
        this.element.querySelector('h2').innerText = this.project.title;
        this.element.querySelector('h3').innerText = this.persons + ' assigned';
        this.element.querySelector('p').innerText = this.project.description;
        if (this.project.selected === ProjectSelected.selected) {
            this.element.classList.add('selected');
        }
        else if (this.project.selected === ProjectSelected.notSelected) {
            this.element.classList.remove('selected');
        }
    }
}
class List extends Component {
    constructor(type, selected) {
        super('list', 'app', false, `${type}-projects`);
        this.type = type;
        this.selected = selected;
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
            prjState.moveProject(prjId, this.type === 'active' ? ProjectStatus.active : ProjectStatus.finished);
        };
        this.dragLeaveHandler = (_) => {
            const listEl = this.element.querySelector('ul');
            listEl.classList.remove('droppable');
        };
        this.clickHandler = (event) => {
            if (this.type === 'active') {
                //get all active projects
                const activeProjects = prjState.projects.filter(prj => prj.status === ProjectStatus.active);
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
        this.configure();
        this.contentRender();
    }
    configure() {
        this.element.addEventListener('dragover', this.dragOverHandler);
        this.element.addEventListener('dragleave', this.dragLeaveHandler);
        this.element.addEventListener('drop', this.dropHandler);
        this.isResponsive = this.widthResponsive >= window.innerWidth;
        prjState.addListener((projects) => {
            const relevantProjects = projects.filter(prj => this.type === 'active' ? prj.status === ProjectStatus.active : prj.status === ProjectStatus.finished);
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
        if (this.type === 'active') {
            this.element.querySelector('#div1').innerHTML = `<img src="fleche-vers-le-bas%20(1).png" width="2%" height="10%">`;
            this.element.querySelector('#div2').innerHTML = `<img src="fleche-vers-le-bas.png" width="2%" height="10%"> `;
            this.element.querySelector('#div1').addEventListener('click', this.clickHandler);
            this.element.querySelector('#div2').addEventListener('click', this.changeSelectedHandler);
            console.log(this.element.querySelector('#div1').innerHTML);
            console.log(this.element.querySelector('#div2').innerHTML);
        }
        else {
            this.element.querySelector('#div1').innerHTML = `<img src="fleches-vers-le-haut.png" width="2%" height="10%">`;
            this.element.querySelector('#div2').innerHTML = `<img src="angle-de-la-fleche-vers-le-haut.png" width="2%" height="10%">`;
            this.element.querySelector('#div1').addEventListener('click', this.clickHandler);
            this.element.querySelector('#div2').addEventListener('click', this.changeSelectedHandler);
            console.log(this.element.querySelector('#div2').innerHTML);
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
const activeList = new List('active', 0);
const finishedList = new List('finished', 0);
