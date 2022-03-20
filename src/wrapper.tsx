import {Cell} from '@jupyterlab/cells';

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

export {Wrapper};