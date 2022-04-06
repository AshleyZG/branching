import {
    OutputArea,
  } from '@jupyterlab/outputarea';

  

export class MyOutputArea extends OutputArea {
    bindModel(): void{
        this.model.changed.connect(this.onModelChanged, this);
        this.model.stateChanged.connect(this.onStateChanged, this);
    }

    deBindModel(): void{
        this.model.changed.disconnect(this.onModelChanged, this);
        this.model.stateChanged.disconnect(this.onStateChanged, this);
    }
}