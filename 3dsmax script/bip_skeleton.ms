--   _  _____ _   _   
--  | ||_   _| |_| |
--  | |_ | | |  _  |
--  |___||_| |_| |_|
--  @author lo.th / http://lo-th.github.io/labs/

-- start with script from http://www.scriptspot.com/3ds-max/scripts/bones-from-biped

--  bip_skeleton
--  version 0.2a

--  biped to skeleton export for sea3d 
--  bipêd to skeleton export fbx in motion builder or blender for BVH aniamtion

--macroScript BipedBonesBVH category:"# Scripts"
--(

global BVH = false
global FIN = false
global CURENT = 0

fn setBoneProps BoneNode Parent BoneNewName BLength BWidth BHeight sidefins sidefinssize sidefinsstarttaper sidefinsendtaper frontfin frontfinsize frontfinstarttaper frontfinendtaper backfin backfinsize backfinstarttaper backfinendtaper boneScaleType boneFreezeLength BoneTaper BoneColor =
(
	BoneNode.parent = Parent; BoneNode.name = BoneNewName
	BoneNode.length = BLength; BoneNode.width = BWidth; BoneNode.height = BHeight
	BoneNode.sidefins = sidefins; BoneNode.sidefinssize = sidefinssize; BoneNode.sidefinsstarttaper = sidefinsstarttaper; BoneNode.sidefinsendtaper = sidefinsendtaper
	BoneNode.frontfin = frontfin; BoneNode.frontfinsize = frontfinsize; BoneNode.frontfinstarttaper = frontfinstarttaper; BoneNode.frontfinendtaper = frontfinendtaper
	BoneNode.backfin = backfin; BoneNode.backfinsize = backfinsize; BoneNode.backfinstarttaper = backfinstarttaper; BoneNode.backfinendtaper = backfinendtaper
	BoneNode.boneScaleType = boneScaleType; BoneNode.boneFreezeLength = boneFreezeLength
	BoneNode.taper = BoneTaper; BoneNode.wirecolor = BoneColor
)

fn AddPosConstraint BoneNode controller_nr controller_weight target target_weight is_relative =
(
	if classof BoneNode.position.controller != Position_List then BoneNode.position.controller = Position_List()
	BoneNode.position.controller[controller_nr].controller = Position_Constraint()
	BoneNode.position.controller[controller_nr].controller.appendTarget target target_weight
	BoneNode.position.controller[controller_nr].controller.relative = is_relative
	BoneNode.position.controller.weight[controller_nr] = controller_weight
)

fn AddOrientConstraint BoneNode controller_nr controller_weight target target_weight is_relative =
(
	if classof BoneNode.rotation.controller != Rotation_List then BoneNode.rotation.controller = Rotation_List()
	BoneNode.rotation.controller[controller_nr].controller = Orientation_Constraint()
	BoneNode.rotation.controller[controller_nr].controller.appendTarget target target_weight
	BoneNode.rotation.controller[controller_nr].controller.relative = is_relative
	BoneNode.rotation.controller.weight[controller_nr] = controller_weight
)

-- StoUP_axis  	0 - X axis 	1 - Y axis  2 - Z axis
fn AddLookConstraint BoneNode controller_nr controller_weight target target_axisFlip target_weight upnode_world pickUpNode StoUP_axis StoUP_axisFlip upnode_axis lookat_vector_length is_relative =
(
	if classof BoneNode.rotation.controller != Rotation_List then BoneNode.rotation.controller = Rotation_List()
	BoneNode.rotation.controller[controller_nr].controller = LookAt_Constraint()
	BoneNode.rotation.controller[controller_nr].controller.target_axisFlip = target_axisFlip
	BoneNode.rotation.controller[controller_nr].controller.upnode_world = upnode_world
	BoneNode.rotation.controller[controller_nr].controller.upnode_axis = upnode_axis
	BoneNode.rotation.controller[controller_nr].controller.StoUP_axis = StoUP_axis
	BoneNode.rotation.controller[controller_nr].controller.StoUP_axisFlip = StoUP_axisFlip
	BoneNode.rotation.controller[controller_nr].controller.lookat_vector_length = lookat_vector_length
	BoneNode.rotation.controller[controller_nr].controller.appendTarget target target_weight
	BoneNode.rotation.controller[controller_nr].controller.pickUpNode = pickUpNode
	BoneNode.rotation.controller[controller_nr].controller.relative = is_relative
	BoneNode.rotation.controller.weight[controller_nr] = controller_weight
)

fn MakeDummy NewName BoneColor PosStart =
(
	d = dummy name:NewName boxsize:[1,1,1] pos:PosStart
	d.wirecolor = BoneColor
	return d

)

fn CreateBone NewName Parent BoneColor PosStart PosEnd Rot rotlocalx Lookat1Target Lookat1_weight Lookat1XFlip Lookat1controller_nr Lcontroller1_weight Lookat1Node Lookat1Axiss1 Lookat1Axiss2 Lookat2Target Lookat2_weight Lookat2XFlip Lookat2controller_nr Lcontroller2_weight Lookat2Node  Lookat2Axiss1 Lookat2Axiss2 	Orient1target Orient1target_weight Orient1controller_nr Orient1controller_weight Orient1is_relative Orient2target Orient2target_weight Orient2controller_nr Orient2controller_weight Orient2is_relative PositionTarget =
(

	if BVH == false then (

		isfin = FIN

		forceNode = false
		if findstring NewName "End_" != undefined then forceNode = true

	    if BoneColor == color 113 134 6 then ( isfin = false )
	    if BoneColor == color 108 8 136 then ( isfin = false )

		bb = nodeGetBoundingBox PositionTarget PositionTarget.transform 
        sizer = bb[2] - bb[1]
        sy = sizer.z
        sz = sizer.y

		if NewName == "rHand" then (sy = sizer.y; sz = sizer.z )
		if NewName == "lHand" then (sy = sizer.y; sz = sizer.z )

		if forceNode == true then (

			boneN = MakeDummy NewName BoneColor PosStart
	        --boneN.showLinks = true
	        --boneN.showLinksOnly = true
	        boneN.parent = Parent
	        in coordsys local rotate boneN (EulerAngles rotlocalx 0 0)
	        --freeze boneN
	        --hide boneN

		) else (

	    	boneN = BoneSys.createBone PosStart PosEnd Rot
	    	in coordsys local rotate boneN (EulerAngles rotlocalx 0 0)

	    	if isfin == true then (
				setBoneProps boneN Parent NewName boneN.Length 1 1 false 2 0 0 false 2 0 0 false 2 0 0 #Scale false 0 BoneColor
				boneN.sideFins = true
				boneN.sideFinssize = sy*0.5
				boneN.sideFinsstarttaper = 20
				boneN.sideFinsendtaper = 20
				boneN.frontFin = true
				boneN.frontFinsize = sz*0.5
				boneN.frontFinstarttaper = 20
				boneN.frontFinendtaper = 20
				boneN.backFin = true
				boneN.backFinsize = sz*0.5
				boneN.backFinstarttaper = 20
				boneN.backFinendtaper = 20
			) else (
			    setBoneProps boneN Parent NewName boneN.Length sy sz false 2 0 0 false 2 0 0 false 2 0 0 #Scale false 0 BoneColor
			)

		)

	) else (

	    boneN = MakeDummy NewName BoneColor PosStart

	    --boneN = dummy name:NewName boxsize:[1,1,1] pos:PosStart
	    boneN.showLinks = true
	    boneN.showLinksOnly = true
	    --boneN.wirecolor = BoneColor
	    boneN.parent = Parent
	    --move boneN PosStart
	    rotate boneN (EulerAngles Rot.x Rot.y Rot.z)
		--boneN.Length = 1
		in coordsys local rotate boneN (EulerAngles rotlocalx -90 -90)
		if CURENT == 1 then ( 
			in coordsys local rotate boneN (angleaxis 90 [0,0,1])
			in coordsys local rotate boneN (angleaxis 180 [1,0,0])
		)
		if CURENT == 2 then (
			in coordsys local rotate boneN (angleaxis -90 [0,0,1])
			in coordsys local rotate boneN (angleaxis 180 [1,0,0])
		)
		if CURENT == 3 then ( 
			in coordsys local rotate boneN (angleaxis 180 [0,0,1])
		)

	)

	global NewBone = boneN

	if Lookat1Target != U then (AddLookConstraint NewBone Lookat1controller_nr Lcontroller1_weight Lookat1Target Lookat1XFlip Lookat1_weight false Lookat1Node Lookat1Axiss1 false Lookat1Axiss2 0 false)
	if Lookat2Target != U then (AddLookConstraint NewBone Lookat2controller_nr Lcontroller2_weight Lookat2Target Lookat2XFlip Lookat2_weight false Lookat2Node Lookat2Axiss1 false Lookat2Axiss2 0 false)
	if Orient1Target != U then (AddOrientConstraint NewBone Orient1controller_nr Orient1controller_weight Orient1target Orient1target_weight Orient1is_relative)
	if Orient2Target != U then (AddOrientConstraint NewBone Orient2controller_nr Orient2controller_weight Orient2target Orient2target_weight Orient2is_relative)
	if PositionTarget != U then (AddPosConstraint NewBone 1 100 PositionTarget 100 false)
	
)

/*fn CreateUpperTwists LimbA LimbB LimbC Names TwistsSuffix col =
(
	TwistL = (distance LimbB LimbC)/4
	TwistPoint = point pos:LimbB.transform.pos; TwistPoint.transform = LimbC.transform; TwistPoint.name = "TwistHelper" + LimbB.name; TwistPoint.size = 10; TwistPoint.cross = false; TwistPoint.box = true; TwistPoint.wirecolor = color 255 0 0; TwistPoint.parent = LimbA
	AddOrientConstraint TwistPoint 1 100 LimbA 100 false
 	CreateBone (LimbB.name + TwistsSuffix[1]) LimbB col LimbB.transform.row4 ([TwistL, 0, 0] * LimbB.transform) LimbB.transform.row3 0 	LimbC 50 false 1 100 LimbA 1 1    TwistPoint 50 false 1 100 LimbA 1 1		U 0 0 0 0  U 0 0 0 0   LimbB
	CreateBone (LimbB.name + TwistsSuffix[2]) NewBone col ([TwistL, 0, 0] * NewBone.transform)	([TwistL*2, 0, 0] * NewBone.transform) NewBone.transform.row3 0 	LimbC 100 false 1 100 NewBone 2 2    U 0 0 0 0 0 0 0   U 0 0 0 0   U 0 0 0 0   U
 	CreateBone (LimbB.name + TwistsSuffix[3]) NewBone col ([TwistL, 0, 0] * NewBone.transform)	([TwistL*2, 0, 0] * NewBone.transform) NewBone.transform.row3 0 	LimbC 100 false 1 50 NewBone 2 2    LimbC 100 false 2 50 LimbB 2 2   U 0 0 0 0   U 0 0 0 0   U
	CreateBone (LimbB.name+ TwistsSuffix[4]) NewBone col ([TwistL, 0, 0] * NewBone.transform) LimbC.transform.row4	NewBone.transform.row3 0 	LimbC 100 false 1 100 LimbB 2 2    U 0 0 0 0 0 0 0   U 0 0 0 0   U 0 0 0 0   U
	CreateBone (LimbB.name + "TwistsEnd") NewBone (color 255 0 0) LimbC.transform.row4 ([1, 0, 0] * LimbC.transform) LimbC.transform.row3 0 	U 0 0 0 0 0 0 0    U 0 0 0 0 0 0 0   U 0 0 0 0   U 0 0 0 0   LimbC
	freeze NewBone; hide NewBone
)

fn CreateLowerTwists LimbA LimbB LimbC Names TwistsSuffix col LastTwistAxiss=
(
	TwistL = (distance LimbB LimbC)/4; A = LastTwistAxiss
	CreateBone (LimbB.name + TwistsSuffix[1]) LimbB col LimbB.transform.row4 ([TwistL, 0, 0] * LimbB.transform) LimbB.transform.row3 0 U 0 0 0 0 0 0 0    U 0 0 0 0 0 0 0   LimbA 50 1 100 false   LimbB 50 1 100 false   LimbB
	CreateBone (LimbB.name + TwistsSuffix[2]) NewBone col ([TwistL, 0, 0] * NewBone.transform) ([TwistL*2, 0, 0] * NewBone.transform) NewBone.transform.row3 0 LimbC 100 false 1 100 NewBone 2 2    U 0 0 0 0 0 0 0   U 0 0 0 0   U 0 0 0 0   U
	CreateBone (LimbB.name + TwistsSuffix[3]) NewBone col ([TwistL, 0, 0] * NewBone.transform) ([TwistL*2, 0, 0] * NewBone.transform) NewBone.transform.row3 0 LimbC 100 false 1 50 NewBone A A    LimbC 100 false 2 50 LimbC A A   U 0 0 0 0   U 0 0 0 0   U
	CreateBone (LimbB.name+ TwistsSuffix[4]) NewBone col ([TwistL, 0, 0] * NewBone.transform) LimbC.transform.row4 NewBone.transform.row3 0 LimbC 100 false 1 100 LimbC A A    U 0 0 0 0 0 0 0   U 0 0 0 0   U 0 0 0 0   U
	CreateBone (LimbB.name + "TwistsEnd") NewBone (color 255 0 0) LimbC.transform.row4 ([1, 0, 0] * LimbC.transform) LimbC.transform.row3 0 U 0 0 0 0 0 0 0    U 0 0 0 0 0 0 0   U 0 0 0 0   U 0 0 0 0   LimbC
	freeze NewBone; hide NewBone
)*/

fn CreateHand ArmLink FingerLink Bip Biped_ctrl HNames FNames TwistsSuffix col1 col2 Spine ShoulderXrot ArmXrot ForearmXrot HandXrot FingersXrot =
(
	BShoulder = (biped.getNode Bip ArmLink link:1); BArm = (biped.getNode Bip ArmLink link:2); BForearm = (biped.getNode Bip ArmLink link:3); BHand = (biped.getNode Bip ArmLink link:4)
	CreateBone HNames[1] Spine col2 BShoulder.transform.row4 BArm.transform.row4 BShoulder.transform.row3 ShoulderXrot    U 0 0 0 0 0 0 0   U 0 0 0 0 0 0 0   BShoulder 100 1 100 true   U 0 0 0 0   BShoulder
	Shoulder = NewBone
	CreateBone HNames[2] NewBone col2 BArm.transform.row4 BForearm.transform.row4 BArm.transform.row3 ArmXrot    U 0 0 0 0 0 0 0   U 0 0 0 0 0 0 0   BArm 100 1 100 true   U 0 0 0 0   BArm
	Arm = NewBone
	CreateBone HNames[3] NewBone col2 BForearm.transform.row4 BHand.transform.row4 BForearm.transform.row3 ForearmXrot    U 0 0 0 0 0 0 0   U 0 0 0 0 0 0 0   BForearm 100 1 100 true   U 0 0 0 0   BForearm
	Forearm = NewBone
	HandSize = if BHand.children[1] != undefined then (distance BHand BHand.children[1]) else 4
	CreateBone HNames[4] NewBone col2 BHand.transform.row4 ([HandSize, 0, 0] * BHand.transform) BHand.transform.row3 HandXrot    U 0 0 0 0 0 0 0   U 0 0 0 0 0 0 0   BHand 100 1 100 true   U 0 0 0 0   BHand
	Hand = NewBone
	if Biped_ctrl.fingers > 0 then
	(
		Finger = 1; finger_index = 1
		for Finger = 1 to Biped_ctrl.fingers do
		(
			NewBone = Hand
			for index = 1 to Biped_ctrl.fingerLinks do
			(
				if (biped.getNode Bip FingerLink link:(finger_index))!=U then
				(
					global BipFinger = biped.getNode Bip FingerLink link:finger_index
					global FingerName = if Biped_ctrl.fingers == 1 then (if Biped_ctrl.fingerLinks == 1 then FNames[6] else (FNames[6] + index as string) ) else (if Biped_ctrl.fingerLinks == 1 then FNames[Finger] else (FNames[Finger] + index as string))
					CreateBone FingerName NewBone col1 BipFinger.transform.row4 BipFinger.children[1].transform.row4 BipFinger.transform.row3 FingersXrot    U 0 0 0 0 0 0 0   U 0 0 0 0 0 0 0   BipFinger 100 1 100 true   U 0 0 0 0   BipFinger
				)
				finger_index += 1
			)
			CreateBone ( "End_" + FingerName ) NewBone (color 255 0 0) BipFinger.children[1].transform.row4 ([1, 0, 0] * BipFinger.children[1].transform) BipFinger.children[1].transform.row3 FingersXrot    U 0 0 0 0 0 0 0   U 0 0 0 0 0 0 0   U 0 0 0 0   U 0 0 0 0   BipFinger.children[1]
			--if BVH == false then ( freeze NewBone; hide NewBone )
		)
	)
	--CreateUpperTwists Shoulder Arm Forearm HNames TwistsSuffix col1
	--CreateLowerTwists Arm Forearm Hand HNames TwistsSuffix col1 1
)

fn CreateLeg LegLink ToeLink Bip Biped_ctrl LNames TNames TwistsSuffix col1 col2 Hips UplegXrot LegXrot LowLegXrot FootXrot ToesXrot =
(
	L1 = biped.getNode Bip LegLink link:1; L2 = biped.getNode Bip LegLink link:2; L3 = biped.getNode Bip LegLink link:3; F = biped.getNode Bip LegLink link:Biped_ctrl.legLinks
	CreateBone LNames[1] Hips col2 L1.transform.row4 L2.transform.row4 L1.transform.row3 UplegXrot    U 0 0 0 0 0 0 0   U 0 0 0 0 0 0 0  L1 100 1 100 true   U 0 0 0 0   L1
	Upleg = NewBone
	CreateBone LNames[2] NewBone col2  L2.transform.row4 L3.transform.row4 L2.transform.row3 LegXrot    U 0 0 0 0 0 0 0  U 0 0 0 0 0 0 0  L2 100 1 100 true   U 0 0 0 0   L2
	Leg = NewBone
	if Biped_ctrl.legLinks == 4 then
	(
		CreateBone LNames[3] NewBone col2  L3.transform.row4 F.transform.row4 L3.transform.row3 LowLegXrot    U 0 0 0 0 0 0 0  U 0 0 0 0 0 0 0 L3 100 1 100 true   U 0 0 0 0   L3
		global LowLeg = NewBone
	)
	FootSize = (distance F F.children[1])*0.5
	CreateBone LNames[4] NewBone col2  F.transform.row4 ([FootSize, 0, 0] * F.transform) F.transform.row3 FootXrot    U 0 0 0 0 0 0 0  U 0 0 0 0 0 0 0  F 100 1 100 true   U 0 0 0 0   F
	Foot = NewBone
	if BVH == false then ( Foot.backfin = false; Foot.frontfin = true; Foot.frontfinsize = FootSize; Foot.frontfinstarttaper = 80; Foot.frontfinendtaper = 0 )
	Toe = 1; toe_index = 1
	for Toe = 1 to Biped_ctrl.toes do (
		NewBone = Foot
		for index = 1 to Biped_ctrl.toeLinks do (
			if (biped.getNode Bip ToeLink link:toe_index)!=U then
			(
				global BipToe = biped.getNode Bip ToeLink link:toe_index
				global ToeName = if Biped_ctrl.toes == 1 then (if Biped_ctrl.toeLinks == 1 then TNames[6] else (TNames[6] + index as string) ) else (if Biped_ctrl.toeLinks == 1 then TNames[Toe] else (TNames[Toe] + index as string))
				CreateBone ToeName NewBone col1 BipToe.transform.row4 BipToe.children[1].transform.row4 BipToe.transform.row3 ToesXrot    U 0 0 0 0 0 0 0   U 0 0 0 0 0 0 0   BipToe 100 1 100 true   U 0 0 0 0   BipToe
			)
			toe_index += 1
		)
		CreateBone ( "End_" + ToeName ) NewBone (color 255 0 0) BipToe.children[1].transform.row4 ([1, 0, 0] * BipToe.children[1].transform) BipToe.children[1].transform.row3 ToesXrot    U 0 0 0 0 0 0 0   U 0 0 0 0 0 0 0   U 0 0 0 0   U 0 0 0 0   BipToe.children[1]
		--if BVH == false then ( freeze NewBone; hide NewBone )
	)
	--CreateUpperTwists Hips Upleg Leg LNames TwistsSuffix col1
 	--if Biped_ctrl.legLinks == 4 then ( CreateLowerTwists Upleg Leg LowLeg LNames TwistsSuffix col1 2; CreateLowerTwists Leg LowLeg Foot LNames TwistsSuffix col1 2) else CreateLowerTwists Upleg Leg Foot LNames TwistsSuffix col1 2
)

fn clearLayer Name =
(

	layer = LayerManager.getLayerFromName Name
	if layer != undefined then (
		clearSelection()
		layer.select on
		delete selection
		LayerManager.deleteLayerByName Name
    )

)

fn CreateCharacter =
(

	disableSceneRedraw()
	suspendEditing()
	--undo off

	B = $
	--global BVH = isBvh
	--global FIN = isFin
	CURENT = 0
	Biped_ctrl = B.controller.rootNode.controller
	Bip_ShortThumb = (if (Biped_ctrl.shortThumb == true and Biped_ctrl.fingers >1) then true else false)

	--print Biped_ctrl.spineLinks

	TSuffix = #("TwistA","TwistB","TwistC","TwistD")
	SpineNm = #("root","hip","abdomen","chest","neck","head")
	LHandNm = #("lCollar","lShldr","lForeArm","lHand")
	RHandNm = #("rCollar","rShldr","rForeArm","rHand")
	LFingNm = #("lThumb","lIndex","lMid","lRing","lPinky","lFingers")
	RFingNm = #("rThumb","rIndex","rMid","rRing","rPinky","rFingers")
	LLegNm = #("lThigh","lShin","lLowLeg","lFoot")
	RLegNm = #("rThigh","rShin","rLowLeg","rFoot")
	LToeNm = #("lFootPinky","lFootRing","lFootMid","lFootIndex","lFootBig","lToes")
	RToeNm = #("rFootPinky","rFootRing","rFootMid","rFootIndex","rFootBig","rToes")
	
	-- colors
	c_end = color 0 255 0
	c_pelvis = color 224 198 87
	c_head = color 166 202 240
	c_spine = color 8 110 134
	cb = color 128 128 128
	cr = color 6 134 6
	cl = color 28 28 177
	chr = color 113 134 6
	chl = color 108 8 136

	-- delete old layer
	if BVH == false then ( clearLayer("_SEA_bones") )
	else ( clearLayer("_BVH_export") )

	-- create new layer
	layer = LayerManager.newLayer()
	if BVH == false then ( layer.setname "_SEA_bones" ) else ( layer.setname "_BVH_export" )
	layer.current = true

	-- reselect biped
	select B

	global U
	"reference bone"
	    ReferenceBone = MakeDummy SpineNm[1] cb [0,0,0]
		--ReferenceBone = BoneSys.createBone [0,0,0] [1,0,0] [0,0,1]
		--setBoneProps ReferenceBone U SpineNm[1] 1 1 1 false 0 0 0 false 0 0 0 false 0 0 0 #None true 0 cb
	"nodes"
		P = biped.getNode B #pelvis link:1
		S = biped.getNode B #spine link:1
		N = biped.getNode B #neck link:1
		H = biped.getNode B #head link:1
	"hips"
		CreateBone (SpineNm[2]) ReferenceBone c_pelvis P.transform.row4 S.transform.row4 P.transform.row3 0   U 0 0 0 0 0 0 0   U 0 0 0 0 0 0 0   P 100 1 100 true   U 0 0 0 0   P
		Hips = NewBone
	"spine"
		for i = 1 to Biped_ctrl.spineLinks do (
			SpineName = "spine" + i as string
			if i==1 then ( SpineName =  SpineNm[3] )
			if i==Biped_ctrl.spineLinks then ( SpineName =  SpineNm[4] )

			--SpineName = if Biped_ctrl.spineLinks == 1 then SpineNm[3] else (SpineNm[3] + i as string)
			Si = biped.getNode B #spine link:i
			if i == Biped_ctrl.spineLinks then Sj = N else Sj = biped.getNode B #spine link:(i+1)
			CreateBone SpineName NewBone c_spine Si.transform.row4 Sj.transform.row4 Si.transform.row3 0   U 0 0 0 0 0 0 0   U 0 0 0 0 0 0 0   Si 100 1 100 true   U 0 0 0 0   Si
		)
		LastSpine = NewBone
	"neck"
		for i = 1 to Biped_ctrl.neckLinks do (
			NeckName = if Biped_ctrl.neckLinks == 1 then SpineNm[5] else (SpineNm[5] + i as string)
			Ni = biped.getNode B #neck link:i
			if i == Biped_ctrl.neckLinks then Nj = H else Nj = biped.getNode B #neck link:(i+1)
			CreateBone NeckName NewBone c_spine Ni.transform.row4 Nj.transform.row4 Ni.transform.row3 0   U 0 0 0 0 0 0 0   U 0 0 0 0 0 0 0   Ni 100 1 100 true   U 0 0 0 0 Ni
		)
	"head"
		CreateBone (SpineNm[6]) NewBone c_head H.transform.row4 H.children[1].transform.row4 H.transform.row3 0   U 0 0 0 0 0 0 0   U 0 0 0 0 0 0 0   H 100 1 100 true   U 0 0 0 0 H
		CreateBone ( "End_" + SpineNm[6] ) NewBone c_end H.children[1].transform.row4 ([1, 0, 0] * H.children[1].transform) H.children[1].transform.row4 0    U 0 0 0 0 0 0 0   U 0 0 0 0 0 0 0   U 0 0 0 0   U 0 0 0 0   H.children[1]
		--if BVH == false then ( freeze NewBone; hide NewBone )
	"hands"
	if Biped_ctrl.arms then
	(
		CURENT = 1
		if BVH == false then (CreateHand #lArm #lfingers B Biped_ctrl LHandNm LFingNm TSuffix chl cl LastSpine 0 0 0 -90 -90) else (CreateHand #lArm #lfingers B Biped_ctrl LHandNm LFingNm TSuffix chl cl LastSpine 0 0 0 0 0)
		CURENT = 2
		if BVH == false then (CreateHand #rArm #rfingers B Biped_ctrl RHandNm RFingNm TSuffix chr cr LastSpine 0 0 0 90 90) else (CreateHand #rArm #rfingers B Biped_ctrl RHandNm RFingNm TSuffix chr cr LastSpine 0 0 0 0 0)
	)
	"legs"
	CURENT = 3
	CreateLeg #lleg #ltoes B Biped_ctrl LLegNm LToeNm TSuffix chl cl Hips 0 0 0 0 0
	CreateLeg #rleg #rtoes B Biped_ctrl RLegNm RToeNm TSuffix chr cr Hips 0 0 0 0 0

	resumeEditing()
	enableSceneRedraw()

)

fn RunCharacter =
(

	if classOf $ == Biped_Object then ( 
		CreateCharacter()
	) else ( 
	    select ( getNodeByName "Bip001 Pelvis" )
	    if classOf $ == Biped_Object then ( CreateCharacter() ) 
	)

)

fn ApplyFullSkin =
(

	reflayer = LayerManager.getLayerFromName "_SEA_bones"

	if reflayer != undefined then (

		reflayer.nodes &theNodes

		modPanel.addModToSelection (Skin ()) ui:on

		for vItem in theNodes do (

			if findstring vItem.name "End_" == undefined then skinOps.addBone $.modifiers[#Skin] vItem 1

		)
		
	) else (

	    print "/!\ Needs sea Bones"

	)

)

fn MakeSkeleton =
(

	clearLayer("_SKELETON_export")

	reflayer = LayerManager.getLayerFromName "_SEA_bones"

	if reflayer != undefined then (

		reflayer.nodes &theNodes

		nlayer = LayerManager.newLayer()
		nlayer.setname "_SKELETON_export"
		nlayer.current = true

		Cone smooth:off heightsegs:1 capsegs:1 sides:4 height:2 radius1:1.5 radius2:0 mapcoords:off pos:[0,0,0] name:"armature" isSelected:on
		--Box lengthsegs:1 widthsegs:1 heightsegs:1 length:2 width:2 height:2 mapcoords:on pos:[0,0,0] name:"armature" isSelected:on
		modPanel.addModToSelection (Skin ()) ui:on

		for vItem in theNodes do (

			skinOps.addBone $.modifiers[#Skin] vItem 1
			$.modifiers[#Skin].cross_radius = 0.5

		)
		
	) else (

	    print "/!\ Needs sea Bones"

	)

    --$.modifiers[#Skin].cross_radius = 0.1

)

fn FixBvhHand =
(
	-- Enable auto-key
    set animate on
	-- Select biped and create a new animation layer
	select $'Bip001'
	actionMan.executeAction 972555510 "40171"  -- Biped: Layer - Create
	 
	-- Rotate hands out 90 degrees in the new animation layer
	rHand = getNodeByName "Bip001 R Hand"
	lHand = getNodeByName "Bip001 L Hand"
	rotate rHand (angleaxis 90.0 [0,1,0])
	rotate lHand (angleaxis -90.0 [0,1,0])
	 
	-- Collapse the animation layer, and we're ready for export!
	actionMan.executeAction 972555510 "40174"  -- Biped: Layer - Collapse

)

--"MAIN"
--setCommandPanelTaskMode #modify	
--if classOf $ == Biped_Object then CreateCharacter()
--"Done"
--)

try ( closeRolloutFloater RolloutFloaterTemplate ) catch()

rollout RolloutTemplateA "Sea3d Tools"
(

	checkbox myCheckBox "with fin"
	button myButtonA "Create Sea bones" width:160 height:30
	button myButtonC "Create Skeleton" width:160 height:30
	button myButtonF "Apply Sea bones" width:160 height:30

	on myCheckBox changed theState do ( FIN = myCheckBox.state )
	
	on myButtonA pressed do ( BVH = false; RunCharacter() )
	on myButtonC pressed do MakeSkeleton()
	on myButtonF pressed do ApplyFullSkin()
	
)

rollout RolloutTemplateB "BVH Tools"
(

	button myButtonB "Create Bvh bones" width:160 height:30
	button myButtonD "Fix Hand Rotation" width:160 height:30

	on myButtonB pressed do ( BVH = true; RunCharacter() )
	on myButtonD pressed do FixBvhHand()
	
)

RolloutFloaterTemplate = newrolloutfloater "LTH" 200 260
addrollout RolloutTemplateA RolloutFloaterTemplate
addrollout RolloutTemplateB RolloutFloaterTemplate