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

    hideCell(cell: Cell){
        console.log('not implemented');
        cell.hide();
        console.log(cell.isHidden);
        console.log(this.cellList.map((cell: Cell) => {return cell.isHidden}));
    }

    get length(): number{
        return this.cellList.length;
    }

    get displayLength(): number{
        var isDisplayed: number[] = this.cellList.map((cell: Cell) => {
            return cell.isHidden? 0 : 1;
        });
        var displayLength = isDisplayed.reduce((a,b) => a+b, 0);
        return displayLength;
    }

    get hiddenLength(): number{
        var isHidden: number[] = this.cellList.map((cell: Cell) => {
            return cell.isHidden? 1 : 0;
        });
        var hiddenLength = isHidden.reduce((a,b) => a+b, 0);
        return hiddenLength;
    }
}


interface WrapperProps{
    wrapper: Wrapper;
};
interface WrapperState{
};
class WrapperWidget extends React.Component<WrapperProps, WrapperState>{
    constructor(props:any){
        super(props);

    }
    render(): React.ReactNode {
        return <div className='wrapper'>
            {this.props.wrapper.id}
            <div>Display: {this.props.wrapper.displayLength}</div>
            <div>Hidden: {this.props.wrapper.hiddenLength}</div>
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

    pushCellToWrapper(cell: Cell, wrapperID: number): void{
        var wrapper = this.wrappers[wrapperID];
        wrapper.cellList.push(cell);
        this.stateChanged.emit();
    }

    hideCellInWrapper(cell: Cell, wrapperID: number): void{
        var wrapper = this.wrappers[wrapperID];
        wrapper.hideCell(cell);
        this.stateChanged.emit();
    }

}


class SideViewWidget extends VDomRenderer<SideViewModel> {


    constructor(model: SideViewModel) {
        super(model);
        this.addClass('jp-ReactWidget');
        this.addClass('sideview');

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