/**
 * @author lth / https://github.com/lo-th
 */




function PhysicsSkeleton( object, nodes ) {

	//this.bones = object.skeleton.bones;
	this.nodes = nodes;
	this.upMtx = [];
	this.isShow = false;

	var bone;
	for ( var i = 0, il = this.nodes.length; i < il; i ++ ) {
		//bone = this.bones[ this.nodes[i].userData.boneId ];//
		bone = this.nodes[i].userData.bone;
		bone.userData.isPhysics = true;
		//bone.userData.phyMtx = new THREE.Matrix4();
	}

	THREE.Object3D.call( this );

	this.matrix = object.matrixWorld;
	this.matrixAutoUpdate = false;

	this.show();

}

PhysicsSkeleton.prototype = Object.create( THREE.Object3D.prototype );
PhysicsSkeleton.prototype.constructor = PhysicsSkeleton;

PhysicsSkeleton.prototype.show = function ( b ) {

	if( b !== undefined ) this.isShow = b;

	var i = this.nodes.length;
	while( i-- ){
		this.nodes[i].visible = this.isShow;
	}

}

PhysicsSkeleton.prototype.clear = function () {

	var bone;
    var i = this.nodes.length;
	while( i-- ){
	//for( var i=0, lng = this.nodes.length; i<lng; i++ ){
		bone = this.nodes[i].userData.bone;
        bone.userData.isPhysics = false;
        //bone.userData.phyMtx = new THREE.Matrix4();
    }

	this.nodes = [];
	this.upMtx = [];
	this.matrix = new THREE.Matrix4();

};

PhysicsSkeleton.prototype.updateMatrixWorld = function () {

	var mtx = new THREE.Matrix4();
	var mtx2 = new THREE.Matrix4();
	var p = new THREE.Vector3();
    var s = new THREE.Vector3();
    var q = new THREE.Quaternion();

	//var matrixWorldInv = new THREE.Matrix4();

	return function updateMatrixWorld( force ) {

		//var bones = this.bones;
		var nodes = this.nodes;

		var upMtx = [];

		var node, bone;

		var i = nodes.length;
		while( i-- ){

		//for ( var i = 0, lng = nodes.length; i < lng; i ++ ) {

			node = nodes[i];
			bone = node.userData.bone;
			//bone = bones[ node.userData.boneId ];
			//bone.userData.isPhyics = true;

			if( node.userData.isKinematic ){

				mtx.multiplyMatrices( bone.matrixWorld, node.userData.decal ).decompose( p, q, s );
				upMtx.push([ node.name, p.toArray(), q.toArray() ]);

				bone.userData.phyMtx.copy( bone.matrixWorld );

			} else {

				mtx
                .copy( node.matrixWorld )
                .decompose( p, q, s )
                .compose( p, q, s.set( 1, 1, 1 ) )
                .multiply( node.userData.decalinv );

                if ( bone.parent && bone.parent.isBone ) {

                        mtx2.getInverse( bone.parent.matrixWorld );
                        mtx2.multiply( mtx );

                    } else {

                        mtx2.copy( mtx );

                    }

                bone.userData.phyMtx.copy( mtx );

			}

		}

		this.upMtx = upMtx;

		//THREE.Object3D.prototype.updateMatrixWorld.call( this, force );

    };

}();

