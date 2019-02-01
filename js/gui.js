var gui = ( function () {

'use strict';

var current = 'close';
var ui;
var content, mainMenu, menu, timebarre, topText;
var gender, genderIM
var isOpen = false;

var buttons = []



var MENU = [ 'X', 'VIEW','ANIMATION', 'PHYSICS', 'KINEMATICS' ];

//var bone, sx, sy, sz, wx, wy, wz;

//var hb = 14;
//var hc = '#929292';

var meshDisplay = [];

var bs, cam, camInfo = {};

var selectColor = '#db0bfa'
var over = 'rgba(153,153,153,0.3)'
var selected = 'rgba(80,80,80,0.3)'
var out = 'none';

var tmp = {};


gui = {

    ID:0,

    update: function () {

    	if( !timebarre.isHide ) timebarre.update();

    },

    resize: function () {

        if( timebarre ) timebarre.resize();

    },

    select: function ( id ) {

        gui.ID = Number( id );
        ui.clear();
        timebarre.hide();
        gui.open();

        switch( gui.ID ){
            case 0: gui.close(); break;
            case 1: gui.view(); break;
            case 2: gui.animation(); break;
            case 3: gui.physics(); break;
            case 4: gui.kinematics(); break;
        }

        gui.upButton();

    },

    upButton: function (){

        var b

        for(var i=0; i<buttons.length; i++ ){

            b = buttons[i];

            if( Number(b.id) === gui.ID && gui.ID !== 0 ) b.style.background = selected;
            else b.style.background = out;

        }

    },

    getDom: function () { return content; },

    init: function ( container ) {

    	container = container || document.body;

        content = document.createElement( 'div' );
        content.style.cssText = 'position:absolute; top:0; left:0; pointer-events:none; width:100%; height:100%; overflow:hidden; ';
        container.appendChild( content );

        gender = document.createElement( 'div' );
        gender.style.cssText = 'position: absolute; bottom:50px; left:10px; pointer-events:auto; width:60px; height:90px; cursor:pointer;';

        topText = document.createElement( 'div' );
        topText.style.cssText = 'position: absolute; top:0px; right:0px; color:#000; font-size: 14px; margin:0px 0px; padding: 0px 15px; line-height:40px; pointer-events:none; width:60px; height:40px; text-align: center; ';

        mainMenu = document.createElement( 'div' );
        mainMenu.style.cssText = 'position:absolute; top:40px; right:0; pointer-events:none; width:200px;';
        
        menu = document.createElement( 'div' );
        menu.style.cssText = 'position: absolute; top:0px; left:0px; height:40px; width:100%; pointer-events:none; ';

        content.appendChild( gender );
        content.appendChild( topText );
        content.appendChild( mainMenu );
        content.appendChild( menu );

        timebarre = new Timebarre( content, selectColor );

        for( var i = 0; i < MENU.length; i++ ) this.addButton(i);

        UIL.Tools.setText( 12, '#000', 'Consolas, Monaco, monospace' );
        UIL.Tools.colors.backgroundOver = 'rgba(255,255,255,0.1)';
        UIL.Tools.colors.button = 'rgba(80,80,80,0.3)';
        UIL.Tools.colors.select = selectColor;
        UIL.Tools.colors.boolbg = 'rgba(255,255,255,0.1)';
        ui = new UIL.Gui( { w:250, bg:'rgba(23,23,23,0)', close:false, parent:mainMenu, top:50, css:'right:0;' } );

    },

    setText: function ( t ) {

        topText.innerHTML = t;
        
    },

    addButton: function ( i ) {

        var b = document.createElement('div');
        b.style.cssText =  'color:#000;  font-size: 14px;  margin:0px 0px; padding: 0px 15px; line-height:40px; position:relative; pointer-events:auto; height:40px; display:inline-block; text-align:center; cursor:pointer; transition:all 0.3s ease;';
        b.textContent = MENU[i];
        b.id = i;

        b.addEventListener( 'mouseover', function(e){ this.style.color = '#FFF'; this.style.background = over; }, false );
        b.addEventListener( 'mouseout', function(e){ this.style.color = '#000'; if( gui.ID === Number(this.id) && gui.ID !== 0 ) this.style.background = selected; else this.style.background = out; }, false );
        b.addEventListener( 'click', function(e){ gui.select( this.id ); }, false );

        buttons.push( b );

        menu.appendChild( b );

    },

    close: function () {

        if(!isOpen) return;

        current = 'close';
        mainMenu.style.display = 'none';
        isOpen = false;

    },

    open: function () {

        if( isOpen ) return;
        mainMenu.style.display = 'block';
        isOpen = true;

    },

    //____________________________________________________________

    view: function () {

        current = 'view';
        var gr0 = ui.add('group', { name:'ENVIRONEMENT', h:30 });
        var envs = ['river', 'studio', 'photo', 'color', 'mit', 'street', 'night' ];
        envs.sort();

        for( var i = 0, lng = envs.length; i < lng; i++ ) gr0.add('button', { name:envs[i], h:20, p:0, radius:6 }).onChange( function(v){ loadEnvMap( this.txt )} );
        
        gr0.open();
    
    },

    animation: function () {

    	current = 'animation';

    	timebarre.setReference( character );
    	timebarre.show();

        ui.add('button', { name:'LOAD BVH', h:30, drag:true, p:0, radius:6 }).onChange( parseAnimation );
        ui.add('slide', { name:'timescale', min:0.01, max:2, value:1, precision:2, h:30, stype:2, fontColor:selectColor }).onChange( function(v){ character.setTimeScale( v );  } );


        var gr0 = ui.add('group', { name:'ANIMATIONS', h:30 });

        for(var m in animations){

            gr0.add('button', { name:m, h:20, p:0, radius:6 }).onChange( function (){character.play( this.txt );} );

        }

        /*for(var m in animations){

            gr0.add( animations, m, { min:0, max:1, precision:2, h:30, stype:2, fontColor:selectColor }).onChange( applyAnimations );

        }*/

        var gr1 = ui.add('group', { name:'MORPHS', h:30 });

        for(var m in morphs){

            gr1.add( morphs, m, { min:0, max:1, precision:2, h:30, stype:2, fontColor:selectColor }).onChange( applyMorphs );

        }

        //gr0.open();


    },

    physics: function () {

    	current = 'physics';

        ui.add('Bool', { name:'RAGDOLL', value:simulator.isRagdoll, h:30, p:70, inh:20, fontColor:selectColor }).onChange( simulator.ragdoll );
        ui.add('Bool', { name:'BALLS', value:simulator.isBall, h:30, p:70, inh:20, fontColor:selectColor }).onChange( simulator.ball );

        //ui.add('button', { name:'START', p:0, h:30, radius:6  }).onChange( initPhysics );
        //ui.add('button', { name:'RESET', p:0, h:30, radius:6 }).onChange( physics.reset );

        var gr1 = ui.add('group', { name:'DISPLAY', h:30 });

        gr1.add('Bool', { name:'CHARACTER', value:isModel, p:70, inh:16, fontColor:selectColor } ).onChange( showModel );
        gr1.add('Bool', { name:'HELPER', value:isHelper, p:70, inh:16, fontColor:selectColor  } ).onChange( showHelper );
        gr1.add('Bool', { name:'DEBUG', value:simulator.isShow, p:70, inh:16, fontColor:selectColor } ).onChange( simulator.show );


        


    },

    kinematics: function () {

    	current = 'kinematics';

    },


}

return gui;

})();

var Timebarre = function( p, sel ){

	this.character = null;

    this.select = sel;

    this.playIcon = "<svg width='18px' height='17px'><path fill='#000' d='M 14 8 L 5 3 4 4 4 13 5 14 14 9 14 8 Z'/></svg>";
    this.pauseIcon = "<svg width='18px' height='17px'><path fill='#000' d='M 14 4 L 13 3 11 3 10 4 10 13 11 14 13 14 14 13 14 4 M 8 4 L 7 3 5 3 4 4 4 13 5 14 7 14 8 13 8 4 Z'/></svg>";

    this.playing = true;

    this.parent = p;

    this.down = false;
    this.isHide = true;

    this.width = window.innerWidth - 80;
    this.totalFrame = 0;
    this.frame = 0;
    this.ratio = 0;

    this.content = document.createElement('div');
    this.content.style.cssText = "position:absolute; bottom:0; left:0px; width:100%; height:50px; pointer-events:none; display:none; ";
    this.parent.appendChild( this.content );

    this.timeInfo = document.createElement('div');
    this.timeInfo.style.cssText = "position:absolute; bottom:36px; left:60px; width:200px; height:10px; pointer-events:none; color:#000; ";
    this.content.appendChild(this.timeInfo);

    this.timeline = document.createElement('div');
    this.timeline.style.cssText = "position:absolute; bottom:20px; left:60px; width:"+this.width+"px; height:5px; border:3px solid rgba(0,0,0,0.2); pointer-events:auto; cursor:pointer;";
    this.content.appendChild(this.timeline);

    this.framer = document.createElement('div');
    this.framer.style.cssText = "position:absolute; top:0px; left:0px; width:1px; height:5px; background:#000; pointer-events:none;";
    this.timeline.appendChild(this.framer);

    this.playButton = document.createElement('div');
    this.playButton.style.cssText = "position:absolute; top:5px; left:10px; width:18px; height:18px; pointer-events:auto; cursor:pointer; border:3px solid rgba(0,0,0,0.2); padding: 5px 5px;";
    this.content.appendChild( this.playButton );

    this.playButton.innerHTML = this.playing ? this.playIcon : this.pauseIcon;
    this.playButton.childNodes[0].childNodes[0].setAttribute('fill', '#000');

    var _this = this;
    //window.addEventListener( 'resize', function(e){ _this.resize(e); }, false );
    this.timeline.addEventListener( 'mouseover', function ( e ) { _this.tOver(e); }, false );
    this.timeline.addEventListener( 'mouseout', function ( e ) { _this.tOut(e); }, false );

    this.timeline.addEventListener( 'mousedown', function ( e ) {  _this.tDown(e); }, false );
    document.addEventListener( 'mouseup', function ( e ) {  _this.tUp(e); }, false );
    document.addEventListener( 'mousemove', function ( e ) {  _this.tMove(e); }, false );//e.stopPropagation();

    this.playButton.addEventListener('mousedown',  function ( e ) { _this.play_down(e); }, false );
    this.playButton.addEventListener('mouseover',  function ( e ) { _this.play_over(e); }, false );
    this.playButton.addEventListener('mouseout',  function ( e ) { _this.play_out(e); }, false );

}


Timebarre.prototype = {

	setReference: function ( character ) {

		this.character = character;

	},

    inPlay: function ( e ) {
        this.playing = true;
        this.playButton.innerHTML = this.playIcon;
    },

    play_down: function ( e ) {

        if( this.playing ){ 
            this.playing = false;
            this.character.pauseAll();
        } else {
            this.playing = true;
            this.character.unPauseAll();
        }

        this.playButton.innerHTML = this.playing ? this.playIcon : this.pauseIcon;

    },

    play_over: function ( e ) { 

        //this.playButton.style.border = "1px solid " + selectColor;
        //this.playButton.style.background = selectColor;
        this.playButton.childNodes[0].childNodes[0].setAttribute('fill', this.select );

    },

    play_out: function ( e ) { 

        //this.playButton.style.border = "1px solid #3f3f3f";
        //this.playButton.style.background = 'none';
        this.playButton.childNodes[0].childNodes[0].setAttribute('fill', '#000');

    },

    show: function () {

        if(!this.isHide) return;
        this.content.style.display = 'block';
        this.isHide = false;
    },

    hide:function () {

        if(this.isHide) return;
        this.content.style.display = 'none';
        this.isHide = true;

    },
    
    setTotalFrame: function ( t, ft ) {

        this.totalFrame = t;
        this.frameTime = ft;
        this.ratio = this.totalFrame / this.width;
        this.timeInfo.innerHTML = this.totalFrame + ' frames';

    },

    resize: function ( e ) {

        this.width = window.innerWidth - 80;
        this.timeline.style.width = this.width +'px';
        this.ratio = this.totalFrame / this.width;

    },

    update: function () {

    	if( this.character === null ) return;

    	this.character.getAnim();
		this.setTotalFrame( this.character.anim.end, this.character.anim.time );

        this.frame = this.character.anim.frame;
        this.timeInfo.innerHTML = this.character.anim.name + ': ' + this.frame + ' / ' + this.totalFrame;
        this.framer.style.width = this.frame / this.ratio + 'px';

    },

    tOut: function( e ) {

        if(!this.down) this.framer.style.background = "#000";

    },

    tOver: function ( e ) {

        this.framer.style.background = this.select;

    },

    tUp: function ( e ) {

        this.down = false;
        this.framer.style.background = "#000";

    },

    tDown: function ( e ) {

        this.down = true;
        this.tMove(e);
        this.playing = false;
        this.playButton.innerHTML = this.playing ? this.playIcon : this.pauseIcon;
        this.framer.style.background = this.select;

    },

    tMove: function ( e ) {

        if(this.down){
            var f = Math.floor((e.clientX-60)*this.ratio);
            if(f<0) f = 0;
            if(f>this.totalFrame) f = this.totalFrame; 
            this.frame = f;

            if( this.character === null ) return;

            var offset = f * this.frameTime;
            this.character.play( this.character.anim.name, 0, offset, 1 );
            this.character.pauseAll();

        }
    }

}