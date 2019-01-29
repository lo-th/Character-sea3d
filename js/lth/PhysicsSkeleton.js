/**
 * @author lth / https://github.com/lo-th
 */




function PhysicsSkeleton( object, nodes ) {

	//this.bones = object.skeleton.bones;
	this.nodes = nodes;
	this.upMtx = [];

	THREE.Object3D.call( this );

	this.matrix = object.matrixWorld;
	this.matrixAutoUpdate = false;

	var bone;
	for ( var i = 0, il = nodes.length; i < il; i ++ ) {
		bone = nodes[i].userData.bone;
		bone.userData.isPhysics = true;
	}

}

PhysicsSkeleton.prototype = Object.create( THREE.Object3D.prototype );
PhysicsSkeleton.prototype.constructor = PhysicsSkeleton;

PhysicsSkeleton.prototype.clear = function () {

	this.nodes = [];
	this.upMtx = [];
	this.matrix = new THREE.Matrix4();

};

/*PhysicsSkeleton.prototype.getSkeletontMatrix = function () {

	return this.upMtx;

};*/

PhysicsSkeleton.prototype.updateMatrixWorld = function () {

	//var vector = new THREE.Vector3();
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

		for ( var i = 0, il = nodes.length; i < il; i ++ ) {

			node = nodes[i];
			bone = node.userData.bone;
			//bone.userData.isPhyics = true;

			if( node.userData.isKinematic ){

				mtx.multiplyMatrices( bone.matrixWorld, node.userData.decal ).decompose( p, q, s );
				upMtx.push([ node.name, p.toArray(), q.toArray() ]);

				bone.userData.phyMtx = bone.matrixWorld.clone();

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

                bone.userData.phyMtx = mtx.clone();

			}

		}

		this.upMtx = upMtx;

		//console.log('up')

		/*var geometry = this.geometry;
		var position = geometry.getAttribute( 'position' );

		matrixWorldInv.getInverse( this.root.matrixWorld );

		for ( var i = 0, j = 0; i < bones.length; i ++ ) {

			var bone = bones[ i ];

			if ( bone.parent && bone.parent.isBone ) {

				boneMatrix.multiplyMatrices( matrixWorldInv, bone.matrixWorld );
				vector.setFromMatrixPosition( boneMatrix );
				position.setXYZ( j, vector.x, vector.y, vector.z );

				boneMatrix.multiplyMatrices( matrixWorldInv, bone.parent.matrixWorld );
				vector.setFromMatrixPosition( boneMatrix );
				position.setXYZ( j + 1, vector.x, vector.y, vector.z );

				j += 2;

			}
/
		}

		//geometry.getAttribute( 'position' ).needsUpdate = true;
*/
		THREE.Object3D.prototype.updateMatrixWorld.call( this, force );

    };

}();

