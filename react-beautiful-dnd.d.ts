

declare module 'react-beautiful-dnd' {
    export interface DropResult {
        draggableId: string;
        type: string;
        source: DraggableLocation;
        destination?: DraggableLocation;
        reason: 'DROP' | 'CANCEL';
        combine?: Combine;
        mode: MovementMode;
    }

    export interface DraggableLocation {
        droppableId: string;
        index: number;
    }

    export interface Combine {
        draggableId: string;
        droppableId: string;
    }

    export type MovementMode = 'FLUID' | 'SNAP';

    export interface DroppableProvided {
        innerRef: (element?: HTMLElement | null) => any;
        placeholder?: React.ReactElement<any>;
        droppableProps: any;
    }

    export interface DraggableProvided {
        innerRef: (element?: HTMLElement | null) => any;
        draggableProps: any;
        dragHandleProps?: any;
    }

    export interface DroppableStateSnapshot {
        isDraggingOver: boolean;
        draggingOverWith?: string;
        draggingFromThisWith?: string;
        isUsingPlaceholder: boolean;
    }

    export interface DraggableStateSnapshot {
        isDragging: boolean;
        isDropAnimating: boolean;
        draggingOver?: string;
        combineWith?: string;
        combineTargetFor?: string;
        mode: MovementMode;
    }

    export class DragDropContext extends React.Component<DragDropContextProps> {}
    export class Droppable extends React.Component<DroppableProps> {}
    export class Draggable extends React.Component<DraggableProps> {}

    export interface DragDropContextProps {
        onDragStart?(initial: DragStart, provided: ResponderProvided): void;
        onDragUpdate?(initial: DragUpdate, provided: ResponderProvided): void;
        onDragEnd(result: DropResult, provided: ResponderProvided): void;
    }

    export interface DroppableProps {
        droppableId: string;
        type?: string;
        mode?: 'standard' | 'virtual';
        isDropDisabled?: boolean;
        isCombineEnabled?: boolean;
        direction?: 'vertical' | 'horizontal';
        children: (provided: DroppableProvided, snapshot: DroppableStateSnapshot) => React.ReactElement<any>;
        renderClone?: DraggableChildrenFn;
        getContainerForClone?: () => HTMLElement;
    }

    export interface DraggableProps {
        draggableId: string;
        index: number;
        children: (provided: DraggableProvided, snapshot: DraggableStateSnapshot) => React.ReactElement<any>;
        isDragDisabled?: boolean;
        disableInteractiveElementBlocking?: boolean;
        shouldRespectForcePress?: boolean;
    }

    export interface DragStart {
        draggableId: string;
        type: string;
        source: DraggableLocation;
        mode: MovementMode;
        combine?: Combine;
    }

    export interface DragUpdate extends DragStart {
        destination?: DraggableLocation;
        combine?: Combine;
    }

    export interface ResponderProvided {
        announce: (message: string) => void;
    }

    export type DraggableChildrenFn = (provided: DraggableProvided, snapshot: DraggableStateSnapshot, rubric: DraggableRubric) => React.ReactElement<any>;

    export interface DraggableRubric {
        draggableId: string;
        type: string;
        source: DraggableLocation;
    }
}