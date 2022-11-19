interface Draggable {
    dragStartHandler(event: DragEvent): void;
    dragEndHandler(event: DragEvent): void;
}

interface DragTarget {
    dragOverHandler(event: DragEvent): void;
    dropHandler(event: DragEvent): void;
    dragLeaveHandler(event: DragEvent): void;
}

enum ProjectStatus {
    active,
    finished
}

//create enum with selected and not selected
enum ProjectSelected {
    notSelected,
    selected
}

class Project {
    constructor(public id: string, public title: string, public description: string, public people: number,public status: ProjectStatus, public selected: ProjectSelected) { }
}

type Listener<T> = (items: T[]) => void;

class ListenerState<T> {
    protected listeners: Listener<T>[] = [];

    addListener(listenerFn: Listener<T>) {
        this.listeners.push(listenerFn);
    }
}

class State extends ListenerState<Project>{
    projects: Project[] = [];
    private static instance: State;
    private constructor() {
        super();
    }
    static getInstance() {
        if (this.instance) return this.instance;
        this.instance = new State();
        return this.instance;
    }
    addProject(title: string, desc: string, nums: number) {
        const newProject = new Project( Math.random().toString(), title, desc, nums, ProjectStatus.active, ProjectSelected.notSelected);
        this.projects.push(newProject);
        this.updateListeners();
    }

    moveProject(projectId: string, newStatus: ProjectStatus) {
        const project = this.projects.find(prj => prj.id === projectId);
        if (project && project.status !== newStatus) {
            project.status = newStatus;
            project.selected = ProjectSelected.notSelected;
            this.updateListeners();
        }
    }

    updateListeners() {
        for (const listenerFn of this.listeners) {
            listenerFn(this.projects.slice());
        }
    }

    selectProject(projectId: string) {
        this.projects = this.projects.map(prj => {
            console.log(prj.id, projectId);
            if(prj.id === projectId){
                if (prj && prj.selected !== ProjectSelected.selected) {
                    prj.selected = ProjectSelected.selected;
                }else if (prj && prj.selected !== ProjectSelected.notSelected) {
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
abstract class Component<T extends HTMLElement, U extends HTMLElement> {
    templateElem: HTMLTemplateElement;
    renderElem: T;
    element: U;

    constructor(templateId: string, renderElemId: string, insertAtStart: boolean, newElemId?: string) {
        this.templateElem = document.getElementById(templateId)! as HTMLTemplateElement;
        this.renderElem = document.getElementById(renderElemId)! as T;
        const importedNode = document.importNode(this.templateElem.content, true);
        this.element = importedNode.firstElementChild as U;
        if (newElemId) this.element.id = newElemId;
        this.attach(insertAtStart);
    }

    private attach(insert: boolean) {
        this.renderElem.insertAdjacentElement(insert ? 'afterbegin' : 'beforeend', this.element);
    }

    abstract configure(): void;
    abstract contentRender(): void;
}

class Item extends Component<HTMLUListElement, HTMLLIElement> implements Draggable {
    private project: Project;

    get persons() {
        return this.project.people === 1 ? '1 person' : `${this.project.people} persons`;
    }

    constructor(hostId: string, project: Project) {
        super('single', hostId, false, project.id);
        this.project = project;

        this.configure();
        this.contentRender();
    }

    dragStartHandler = (event: DragEvent) => {
        event.dataTransfer!.setData('text/plain', this.project.id);
        event.dataTransfer!.effectAllowed = 'move';
    }

    dragEndHandler = (_: DragEvent) => {
        console.log('DragEnd');
    }

    configure(){
        this.element.addEventListener('dragstart', this.dragStartHandler);
        this.element.addEventListener('dragend', this.dragEndHandler);
        this.element.addEventListener('click', this.clickSelectedHandler);
    }

    clickSelectedHandler = (event: Event) => {
        //get project id
        prjState.selectProject(this.project.id);
        this.contentRender();

    }

    contentRender(){
        this.element.querySelector('h2')!.innerText = this.project.title;
        this.element.querySelector('h3')!.innerText = this.persons + ' assigned';
        this.element.querySelector('p')!.innerText = this.project.description;
        if(this.project.selected === ProjectSelected.selected){
            this.element.classList.add('selected');
        }else if(this.project.selected === ProjectSelected.notSelected){
            this.element.classList.remove('selected');
        }
    }
}

class List extends Component<HTMLDivElement, HTMLElement> implements DragTarget {
    assignedProjects: Project[];
    constructor(private type: 'active' | 'finished', private selected: 1 | 0) {
        super('list', 'app', false, `${type}-projects`);
        this.assignedProjects = [];
        this.configure();
        this.contentRender();
    }


    dragOverHandler = (event: DragEvent) => {
        if (event.dataTransfer && event.dataTransfer.types[0] === 'text/plain') {
            event.preventDefault();
            const listEl = this.element.querySelector('ul')!;
            listEl.classList.add('droppable');
        }
    }
    dropHandler = (event: DragEvent) => {
        const prjId = event.dataTransfer!.getData('text/plain');
        prjState.moveProject(
            prjId,
            this.type === 'active' ? ProjectStatus.active : ProjectStatus.finished
        );
    }
    dragLeaveHandler = (_: DragEvent) => {
        const listEl = this.element.querySelector('ul')!;
        listEl.classList.remove('droppable');
    }

    clickHandler = (event: Event) => {

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

        }else {
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

    }

    changeSelectedHandler = (event: Event) => {
        const selectedProjects = prjState.projects.filter(prj => prj.selected === ProjectSelected.selected);
        this.assignedProjects = selectedProjects;
        //change status of all selected projects
        for (const project of selectedProjects) {
            if (this.type === 'active') {
                project.status = ProjectStatus.finished;
                project.selected = ProjectSelected.notSelected;

            }else {
                project.status = ProjectStatus.active;
                project.selected = ProjectSelected.notSelected;

            }
        }
        prjState.updateListeners();
        this.projectsRender();
    }

    configure(){
        this.element.addEventListener('dragover', this.dragOverHandler);
        this.element.addEventListener('dragleave', this.dragLeaveHandler);
        this.element.addEventListener('drop', this.dropHandler);

        prjState.addListener((projects: Project[]) => {
            const relevantProjects = projects.filter(prj => this.type === 'active' ? prj.status === ProjectStatus.active : prj.status === ProjectStatus.finished);
            this.assignedProjects = relevantProjects;
            this.projectsRender();
        })
    }

    contentRender() {
        const listId = `${this.type}-projects-list`;
        this.element.querySelector('ul')!.id = listId;
        this.element.querySelector('h2')!.innerText = `${this.type.toUpperCase()} PROJECTS`;
        console.log(this.type);
        if (this.type === 'active') {
            this.element.querySelector('#div1')!.innerHTML = `<img src="fleche-vers-le-bas%20(1).png" width="2%" height="10%">`;
            this.element.querySelector('#div2')!.innerHTML = `<img src="fleche-vers-le-bas.png" width="2%" height="10%"> `;
            this.element.querySelector('#div1')!.addEventListener('click', this.clickHandler);
            this.element.querySelector('#div2')!.addEventListener('click', this.changeSelectedHandler);
            console.log(this.element.querySelector('#div1')!.innerHTML);
            console.log(this.element.querySelector('#div2')!.innerHTML);
        } else {
            this.element.querySelector('#div1')!.innerHTML = `<img src="fleches-vers-le-haut.png" width="2%" height="10%">`;
            this.element.querySelector('#div2')!.innerHTML = `<img src="angle-de-la-fleche-vers-le-haut.png" width="2%" height="10%">`;
            this.element.querySelector('#div1')!.addEventListener('click', this.clickHandler);
            this.element.querySelector('#div2')!.addEventListener('click', this.changeSelectedHandler);
            console.log(this.element.querySelector('#div2')!.innerHTML);
        }
    }

    private projectsRender() {
        const listEl = <HTMLUListElement>document.getElementById(`${this.type}-projects-list`);
        listEl.innerHTML = '';
        for (const prjItem of this.assignedProjects) {
            new Item(this.element.querySelector('ul')!.id, prjItem);
        }

    }
}

class Input extends Component<HTMLDivElement, HTMLFormElement> {
    titleElem: HTMLInputElement;
    descElem: HTMLInputElement;
    peopleElem: HTMLInputElement;

    constructor(){
        super('project', 'app', true, 'user-input');
        this.titleElem = <HTMLInputElement>this.element.querySelector('#title');
        this.descElem = <HTMLInputElement>this.element.querySelector('#description');
        this.peopleElem = <HTMLInputElement>this.element.querySelector('#people');
        this.configure();
    }

    configure(){
        this.element.addEventListener('submit', e => {
            e.preventDefault();
            let userInput:[string, string, number] = [this.titleElem.value, this.descElem.value, +this.peopleElem.value];
            const [title, desc, people] = userInput;
            prjState.addProject(title, desc, people);
            this.titleElem.value = '';
            this.descElem.value = '';
            this.peopleElem.value = '';
        })
    }

    contentRender() {}
}

const projInput = new Input();
const activeList = new List('active', 0);
const finishedList = new List('finished', 0);
