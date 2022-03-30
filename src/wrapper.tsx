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
        cell.hide();
    }

    unhideCell(cell: Cell){
        cell.show();
    }

    updateCellWidth(){
        var newWidth: string = (100/this.displayLength).toString()+'%';
        this.cellList.forEach((cell:Cell) => {
            cell.model.metadata.set('width', newWidth);
        })
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
    tabOnClick: (event: React.MouseEvent) => void;
};
interface WrapperState{
};
class WrapperWidget extends React.Component<WrapperProps, WrapperState>{
    constructor(props:any){
        super(props);

    }
    render(): React.ReactNode {
        return <div className='wrapper' data-wrapperID={this.props.wrapper.id}>
            {this.props.wrapper.id}
            <div>Display: {this.props.wrapper.displayLength}</div>
            <div>Hidden: {this.props.wrapper.hiddenLength}</div>
            {this.props.wrapper.cellList.map((cell: Cell) => {
                if (cell.isHidden){
                    return <div onClick={this.props.tabOnClick} data-cellID={cell.model.id}>{cell.model.id}</div>
                }
                else{
                    return <div></div>
                }
            })}
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
        wrapper.updateCellWidth();
        this.stateChanged.emit();
    }

    hideCellInWrapper(cell: Cell, wrapperID: number): void{
        var wrapper = this.wrappers[wrapperID];
        wrapper.hideCell(cell);
        wrapper.updateCellWidth();
        this.stateChanged.emit();
    }

    unhideCellInWrapper(cellID: string, wrapperID: number): void {
        var wrapper = this.wrappers[wrapperID];
        wrapper.cellList.forEach((cell: Cell) => {
            if (cell.model.id === cellID){
                wrapper.unhideCell(cell);
            }
        })
        wrapper.updateCellWidth();
        this.stateChanged.emit();
    }

}


class SideViewWidget extends VDomRenderer<SideViewModel> {


    constructor(model: SideViewModel) {
        super(model);
        this.addClass('jp-ReactWidget');
        this.addClass('sideview');

        this.wrapperTabOnClick = this.wrapperTabOnClick.bind(this);

    }

    wrapperTabOnClick(event: React.MouseEvent){
        var cellID = event.currentTarget.getAttribute('data-cellID') as string;
        var wrapperID = parseInt(event.currentTarget.parentElement?.getAttribute('data-wrapperID') as string);
        this.model.unhideCellInWrapper(cellID, wrapperID);
    }

    render(): JSX.Element {
        return <div> 
            <UseSignal signal={this.model.stateChanged} >
                {(): JSX.Element => {
                    return <div>{this.model.wrappers.length}
                        {this.model.wrappers.map((wrapper: Wrapper) => {
                            return <WrapperWidget wrapper={wrapper} tabOnClick={this.wrapperTabOnClick}/>
                        })}
                    </div>
                }}
            </UseSignal>

        </div> 

    }
}



export {Wrapper, SideViewWidget, SideViewModel};