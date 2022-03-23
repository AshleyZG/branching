import {Cell} from '@jupyterlab/cells';
import { VDomRenderer, VDomModel, UseSignal } from '@jupyterlab/apputils';

import React from 'react';
class Wrapper {
    id: number;
    cellList: Cell[] = [];

    constructor(id: number){
        this.id = id;
    }

    insertCell(newCell: Cell){
        this.cellList.push(newCell);
    }
    updateCellOrder(){}
    removeCell(){}

    get length(){
        return this.cellList.length;
    }
}


interface WrapperProps{
    wrapper: Wrapper;
};
interface WrapperState{};
class WrapperWidget extends React.Component<WrapperProps, WrapperState>{
    constructor(props:any){
        super(props);
        
    }
    render(): React.ReactNode {
        return <div className='wrapper'>
            {this.props.wrapper.id}
        </div>
    }
}

class SideViewModel extends VDomModel {
    wrappers: Wrapper[] = [];
    constructor(){
        super();
    }

    createWrapper(): Wrapper{
        var wrapper = new Wrapper(this.wrappers.length);
        this.wrappers.push(wrapper);
        this.stateChanged.emit();
        return wrapper;
    }

    pushCellToWrapper(){

    }

}


class SideViewWidget extends VDomRenderer<SideViewModel> {

    sideViewRef: React.RefObject<HTMLElement>;

    constructor(model: SideViewModel) {
        super(model);
        this.addClass('jp-ReactWidget');
        this.addClass('sideview');

        this.sideViewRef =  React.createRef();
    }


    render(): JSX.Element {
        return <div> 
            <UseSignal signal={this.model.stateChanged} >
                {(): JSX.Element => {
                    return <div>{this.model.wrappers.length}
                        {this.model.wrappers.map((wrapper: Wrapper) => {
                            return <WrapperWidget wrapper={wrapper}/>
                        })}
                    </div>
                }}
            </UseSignal>

        </div> 

    }
}



export {Wrapper, SideViewWidget, SideViewModel};