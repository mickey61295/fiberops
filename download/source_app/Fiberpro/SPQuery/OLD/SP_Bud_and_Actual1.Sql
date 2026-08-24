/*
;=============================================
; Author			:		Global Software's
; Create date		:		08/11/2013
; Create By			:		Radhakrishnan.R
; Description		:		Budget Vs Actual  (or) Over All Consolidation
; Change Person		:		Radhakrishnan
; Last Change Date	:		03/12/2013 
; =============================================	

--DBUpdation 
	Alter table Temp_BudgetAndActual add GUID nvarchar(256) null
	Alter table Temp_BudgetAndActualAbs add GUID nvarchar(256) null
	
	Alter VIEW Vue_BudVsAct_Consolid AS SELECT GUID,OrdId, IndexNo, DispName, SUM(BudgetAmt) AS BudgetAmt, SUM(ActualAmt) AS ActualAmt  
	FROM Temp_BudgetAndActual 
	GROUP BY OrdId, IndexNo, DispName,Guid

	Create VIEW Vue_BudVsAct AS SELECT GUID,Slno,OrdId, StageID,DeptID,IndexNo, Description as DispName, Type,SUM(BudgetQty) as BudgetQty,	SUM(BudgetAmt) AS BudgetAmt,SUM(ActualQty) as ActualQty,	SUM(ActualAmt) AS ActualAmt  
	FROM  Temp_BudgetAndActual 
	GROUP BY OrdId, IndexNo, Description,Guid,StageID,DeptID,Slno,Type
	
 drop procedure SP_Bud_and_Actual
exec SP_Bud_and_Actual '72','155,846'
--select * from Temp_BudgetAndActual where DispName ='Fabric' and OrdId = 155
select * from Temp_BudgetAndActual
 
*/


Create Procedure SP_Bud_and_Actual(@Guid nvarchar(256),@OrdID nvarchar(4000),@GPAY char(3) ='YES')
as
begin--B0

Set Nocount on 
SET ANSI_NULLS ON
SET QUOTED_IDENTIFIER ON
		declare @Sno int,
				@MaxSno int,
				@OrdQty int
				
		--@ordid	int
		delete 
		from	Temp_BudgetAndActual 
		where	Guid=@Guid
		
        delete 
        from	Temp_BudgetAndActualAbs 
        where Guid=@Guid
        
		/*Add Budget Yarn*/
        insert into Temp_BudgetAndActual 
        (Guid,	slno,	ordid,			deptid,			
        budgetqty,			
        budgetamt)
		select 
		@Guid,	1,		yarn1.ordid,	yarn1.deptid,	
		Case When IsNull(masd.Manual_BudgetKGs_Entry,'N') ='Y'  Then sum(IsNull(yarn2.Qty,0)) Else sum(yarn1.reqkgs) End as Budgetqty,
		Case When IsNull(masd.Manual_BudgetKGs_Entry,'N') = 'Y' Then sum(IsNull(yarn2.Qty,0)*(isnull(yarn2.rate,0) + isnull(yarn2.Addrate,0)))			
				Else sum(yarn1.reqkgs*(isnull(yarn2.rate,0) + isnull(yarn2.Addrate,0))) End as budgetamt 
		from		pro_reqyarn yarn1	(nolock)
		inner join	pro_reqyarn2 yarn2	(nolock) 
		on	yarn1.ordid		=	yarn2.ordid  	
		and yarn1.deptid	=	yarn2.deptid 		
		and yarn1.Colid		=	yarn2.Colid 		
		AND yarn1.CountId	=	yarn2.CountId 
		INNER JOIN	Mas_Dept  masd		(nolock)
		ON	yarn1.DeptID	= masd.DeptID 
		And yarn2.DeptID	= masd.DeptID 
		where	yarn1.ordid		in	(select id from fnSplitter(@OrdID))
		GROUP BY yarn1.ordid,yarn1.deptid,isNull(masd.Manual_BudgetKGs_Entry,'N')
		
		/*Add Budget Fabric*/
		insert into Temp_BudgetAndActual 
		(Guid	,slno	,ordid		,deptid		,budgetqty		,budgetamt)
		SELECT  
		@Guid	,1		,Kn.OrdId	,Kn.DeptId	, 
		SUM((CASE WHEN U2.UOM = 'KGS' THEN Kn.ReqKgs ELSE Kn.ReqMtr END)) ,
		SUM((CASE WHEN U2.UOM = 'KGS' THEN Kn.ReqKgs ELSE Kn.ReqMtr END) * (ISNULL(Kn2.Rate, 0)  + ISNULL(Kn2.AddRate, 0)))  
		FROM			Pro_ReqKnitt Kn		(nolock)
		INNER JOIN		Pro_ReqKnitt2 Kn2	(nolock)
		ON  Kn.OrdId	= Kn2.OrdId 	AND		Kn.DeptId		= Kn2.DeptId	AND		Kn.FabId	= Kn2.FabId 
		AND Kn.ColId	= Kn2.ColId		AND		Kn.CntID		= Kn2.CntID 	AND		Kn.GSM		= Kn2.GSM		
		AND	Kn.GG		= Kn2.GG 		AND		Kn.LL			= Kn2.LL		AND		Kn.DiaID	= Kn2.DiaID 
		INNER JOIN		Mas_Uom U1			(nolock)			
		INNER JOIN		Mas_Fabric MF		(nolock)	ON		U1.UomID		= MF.PriUomID 
		ON	MF.FabID	= Kn2.FabId				And		Kn.FinDiaID		= Kn2.FinDiaID 
		LEFT OUTER JOIN Mas_UOM  U2			(nolock)	ON		Kn2.RateUOM		= U2.UOMID 
		WHERE Kn.OrdId IN (select id from fnSplitter(@OrdID)) 
		GROUP BY Kn.OrdId, Kn.DeptId
		
/*Other than Requirment and Budgetting Department Arrival*/
		insert into Temp_BudgetAndActual 
		(				Guid,	slno,ordid,deptid	,budgetqty	,budgetamt)
		Select DISTINCT @Guid,	1	,OrdID,Prs_Dept	,0			,0 from Trs_Del1 (nolock)
		INNER JOIN Trs_Del2 (nolock) ON Trs_Del1.ID = Trs_Del2.ID  And Prs_DEpt <>16 and Trs_Del2.Ordid IN (select id from fnSplitter(@OrdID)) 
		Where Prs_dept 
		not in (
		Select distinct DeptId From Pro_ReqYarn (nolock) Where OrdID IN(select id from fnSplitter(@OrdID)) 
		UNION  
		Select distinct DeptId From Pro_ReqKnitt (nolock) Where OrdID in(select id from fnSplitter(@OrdID))
		)
		
		
/*Add Budget Accessories*/
        insert into Temp_BudgetAndActual 
        (		Guid,slno	,ordid				,deptid	,budgetqty					,budgetamt)
		SELECT @Guid,1		,AR.OrdID	,16		,SUM(AR.ReqdQty)	,SUM(AR.ReqdQty * (ISNULL(ABR.BudRate, 0) + ISNULL(ABR.AddRate, 0)))
		FROM		PRO_AccReq AR		(nolock)
		INNER JOIN	Pro_AccBudRate	ABR (nolock)
		ON			AR.OrdID		= ABR.OrdID	
		AND			AR.Acc_Type		= ABR.Acc_Type 	AND AR.Acc_Desc	= ABR.Acc_Desc						
		AND			AR.Clr			= ABR.Clr       AND AR.Siz		= ABR.Siz  
		WHERE AR.ordid in(select id from fnSplitter(@OrdID))
		group by AR.ordid

/*Add Budget PcsProcess*/
	    insert into Temp_BudgetAndActual 
	    (		Guid,slno	,ordid		,deptid		,budgetqty						,  budgetamt)
		select @Guid,2		,PP.ordid	,PP.prodpros,IsNull(Sum(IsNull(PP.Qty,0)),0),(isnull(PP.rate,0) + isnull(PP.Addrate,0))* IsNull(Sum(IsNull(PP.Qty,0)),0)
		from Pro_ProdPros PP (nolock) where PP.ordid in(select id from fnSplitter(@OrdID)) and PP.rate>0  
		group by PP.ordid,PP.prodpros,PP.rate,PP.Addrate
		
		
/* cutPlanQty Column Added*/

	 
		insert into Temp_BudgetAndActual 
		(		Guid,slno	,ordid,	deptid,budgetqty		,budgetamt				,
		ActualQty																,ActualAmt					,StageID)
		Select @Guid,3		,Ordid, Deptid,Sum(budgetqty)	,Sum(OrderQty * Rate)	,
		case when (Sum(budgetqty)*ActualRate)>0 then Sum(budgetqty) else 0 end	,Sum(budgetqty)*ActualRate	, StageID 
		From (
		select distinct PE.ordid,MD.deptid,PE.styleno, 
		IsNull(Sum(QD.CutPlanQty),0)  orderQty, (isnull(PE.rate,0)+isnull(PE.addrate,0)) as  Rate,ActualRate,PE.wrkid as StageID,Sum(QD.CutPlanQty) as budgetqty
		from			Trs_ProdExp		PE		(nolock)
		Inner Join		OrderQtyDtl		QD		(nolock)		On PE.Ordid		=	QD.Ordid	AND		PE.StyleNo = QD.StyleNo 
		left outer join mas_jobwrkcomp	JW		(nolock)		on PE.wrkid		=	JW.id 
		left outer join mas_dept		MD		(nolock)		on JW.deptid	=	MD.deptid 
		where PE.ordid in(select id from fnSplitter(@OrdID))	and  PE.Rate	>	0  
		group by PE.ordid,	MD.deptid,	ActualRate,	PE.wrkid,	PE.styleno, isnull(PE.rate,0)+isnull(PE.addrate,0)
		) A Group by ordid,	deptid,	actualrate,	StageID
		
		
		

/*Inhouse - PRODUCTION */

		;with   cte(Slno,ordid,DeptID,ActQty				,ActAmt						,StID) as  
         (
				Select 3,Ordid,Deptid,Isnull(Sum (Qty),0)	,Isnull(Sum (Qty * Rate),0) ,StageID--, Isnull(Avg(Rate),0) as  AvgRate 
				From (
					SELECT MD.DeptID, TP.OrdId, TP.StageID, TP.StyleNo,
						case Isnull(TP.Rate,0) when 0 then	(
							case Isnull(BPD.Rate,0) when 0 then  TPE.Rate+ ActualRate 
							else Isnull(BPD.Rate,0) end			) 
						else TP.Rate end As Rate , TPQ.ProdPcs AS Qty 
					FROM				Mas_Dept				MD		(nolock)
					RIGHT OUTER JOIN	BudPodet				BPD		(nolock)
					INNER JOIN			BudPoMas				BPM		(nolock)	ON	BPD.Id		=	BPM.Id 
					RIGHT OUTER JOIN	Trs_ProdentryQty		TPQ		(nolock)
					INNER JOIN			Trs_Prodentry			TP		(nolock)	ON	TPQ.id		=	TP.id 
					INNER JOIN			Mas_JobWrkComp			MJW		(nolock)	ON	TP.StageID	=	MJW.Id		ON	BPD.Size	= TPQ.SizId 
					AND					BPD.ColId				=		TP.ClrId	AND BPD.PartId	=	TP.PartId	AND BPM.DeptId	= TP.StageID	
					AND					BPM.OrdId				=		TP.OrdId	AND	BPD.StyleNo	=	TP.StyleNo	ON  MD.DeptID	= MJW.DeptId 
					LEFT OUTER JOIN		Trs_ProdExp				TPE	(	nolock)		ON	TP.StyleNo	=	TPE.StyleNo	AND TP.StageID	= TPE.WrkID		
					AND					TP.OrdId				=		TPE.OrdId  
					LEFT OUTER JOIN		Pro_Prod_PartwiseRate	PPPR	(nolock)	ON	TPE.OrdId	=	PPPR.OrdID	AND TPE.StyleNo = PPPR.StyleNo 
					AND					TPE.WrkId				=		PPPR.WrkID	AND TP.PartId	=	PPPR.PartID 
					WHERE  (TP.ReWork=0	and	TP.OrdId in(select id from fnSplitter(@OrdID)))
					or (RateType_Prs_REWORK = 'P'	and	TP.OrdId in(select id from fnSplitter(@OrdID)))
					)as A 
				Group by Ordid, Deptid ,StageID 
		)
		
		update	tmp
		set		ActualQty		=	ActQty,
				ActualAmt		=	ActAmt
		From	Temp_BudgetAndActual tmp 
		join	cte 
		on		tmp.ordid		=	cte.ordid
		and		tmp.Deptid		=	cte.Deptid
		and		tmp.StageID		=	cte.StID
		and		tmp.Slno		=	cte.Slno
		where	tmp.guid		=	@guid	
		
		
		;with   cte(Slno,ordid,DeptID,ActQty				,ActAmt						,StID) as  
         (
				Select 3,Ordid,Deptid,Isnull(Sum (Qty),0)	,Isnull(Sum (Qty * Rate),0) ,StageID--, Isnull(Avg(Rate),0) as  AvgRate 
				From (
					SELECT MD.DeptID, TP.OrdId, TP.StageID, TP.StyleNo,
						case Isnull(TP.Rate,0) when 0 then	(
							case Isnull(BPD.Rate,0) when 0 then  TPE.Rate+ ActualRate 
							else Isnull(BPD.Rate,0) end			) 
						else TP.Rate end As Rate , TPQ.ProdPcs AS Qty 
					FROM				Mas_Dept				MD		(nolock)
					RIGHT OUTER JOIN	BudPodet				BPD		(nolock)
					INNER JOIN			BudPoMas				BPM		(nolock)	ON	BPD.Id		=	BPM.Id 
					RIGHT OUTER JOIN	Trs_ProdentryQty		TPQ		(nolock)
					INNER JOIN			Trs_Prodentry			TP		(nolock)	ON	TPQ.id		=	TP.id 
					INNER JOIN			Mas_JobWrkComp			MJW		(nolock)	ON	TP.StageID	=	MJW.Id		ON	BPD.Size	= TPQ.SizId 
					AND					BPD.ColId				=		TP.ClrId	AND BPD.PartId	=	TP.PartId	AND BPM.DeptId	= TP.StageID	
					AND					BPM.OrdId				=		TP.OrdId	AND	BPD.StyleNo	=	TP.StyleNo	ON  MD.DeptID	= MJW.DeptId 
					LEFT OUTER JOIN		Trs_ProdExp				TPE	(	nolock)		ON	TP.StyleNo	=	TPE.StyleNo	AND TP.StageID	= TPE.WrkID		
					AND					TP.OrdId				=		TPE.OrdId  
					LEFT OUTER JOIN		Pro_Prod_PartwiseRate	PPPR	(nolock)	ON	TPE.OrdId	=	PPPR.OrdID	AND TPE.StyleNo = PPPR.StyleNo 
					AND					TPE.WrkId				=		PPPR.WrkID	AND TP.PartId	=	PPPR.PartID 
					WHERE  (TP.ReWork=0	and	TP.OrdId in(select id from fnSplitter(@OrdID)) )
					or (RateType_Prs_REWORK = 'P'	and	TP.OrdId in(select id from fnSplitter(@OrdID)))
					)as A 
				Group by Ordid, Deptid ,StageID 
		)
		
		
		insert into Temp_BudgetAndActual(
				Guid,slno		,ordid		,budgetqty	,budgetamt	,ActualQty	,ActualAmt	,StageID	)
		select @Guid,cte.Slno	,cte.ordid	,0			,0			,cte.ActQty	,cte.ActAmt	,cte.StID
		from		cte
		left outer join  Temp_BudgetAndActual tmp
		on		cte.ordid		=	tmp.ordid
		and		cte.Deptid		=	tmp.Deptid
		and		cte.StID		=	tmp.StageID
		and		cte.Slno		=	tmp.Slno

/* Inhouse - REWORK PRODUCTION    */
		;with   cte(Guid,Slno	,ordid,DeptID	,ActQty				,ActAmt						,StID) as  
		(
		Select	   @Guid,4		,Ordid,Deptid	,Isnull(Sum (Qty),0),Isnull(Sum (Qty * Rate),0) ,StageID     --Isnull(Avg(Rate),0) as  AvgRate
		From (
			SELECT MD.DeptID, TP.OrdId, TP.StageID, TP.StyleNo,Isnull(BPD.Rate,0) Rate , 
			TPQ.ProdPcs AS Qty 
			FROM				Mas_Dept				MD		(nolock)
			RIGHT OUTER JOIN	BudPodet				BPD		(nolock)
			INNER JOIN			BudPoMas				BPM		(nolock)	ON	BPD.Id		= BPM.Id 
			RIGHT OUTER JOIN	Trs_ProdentryQty		TPQ		(nolock)
			INNER JOIN			Trs_Prodentry			TP		(nolock)	ON	TPQ.id		= TP.id 
			INNER JOIN			Mas_JobWrkComp			MJW		(nolock)	ON	TP.StageID	= MJW.Id		ON		BPD.Size	=	TPQ.SizId 
			AND					BPD.ColId				=		TP.ClrId	AND BPD.PartId	= TP.PartId		AND		BPM.DeptId	=	TP.StageID 
			AND					BPM.OrdId				=		TP.OrdId	AND BPD.StyleNo = TP.StyleNo	ON		MD.DeptID	=	MJW.DeptId 
			LEFT OUTER JOIN		Trs_ProdExp				TPE		(nolock)	ON	TP.StyleNo	= TPE.StyleNo	AND		TP.StageID	=	TPE.WrkID 
			AND					TP.OrdId				=		TPE.OrdId  
			LEFT OUTER JOIN		Pro_Prod_PartwiseRate	PPPR	(nolock)	ON	TPE.OrdId	= PPPR.OrdID	AND		TPE.StyleNo =	PPPR.StyleNo 
			AND					TPE.WrkId				=		PPPR.WrkID	AND TP.PartId	= PPPR.PartID	
			WHERE	(TP.ReWork		=	1  And TP.OrdId  in(select id from fnSplitter(@OrdID)) )
			or (    BPM.RateType_Prs_REWORK = 'R' And TP.OrdId  in(select id from fnSplitter(@OrdID)))
			)as A 
		Group by Ordid, Deptid ,StageID 		
	)
		update	tmp
		set		ActualQty		=	ActualQty +ActQty,
				ActualAmt		=	ActualAmt + ActAmt
		From	Temp_BudgetAndActual tmp 
		join	cte 
		on		tmp.ordid		=	cte.ordid
		and		tmp.Deptid		=	cte.Deptid
		and		tmp.StageID		=	cte.StID
		and		tmp.Slno		=	cte.Slno
		where	tmp.guid		=	@guid	
		
		;with   cte(Guid,Slno	,ordid,DeptID	,ActQty				,ActAmt						,StID) as  
		(
		Select	   @Guid,4		,Ordid,Deptid	,Isnull(Sum (Qty),0),Isnull(Sum (Qty * Rate),0) ,StageID     --Isnull(Avg(Rate),0) as  AvgRate
		From (
			SELECT MD.DeptID, TP.OrdId, TP.StageID, TP.StyleNo,Isnull(BPD.Rate,0) Rate , 
			TPQ.ProdPcs AS Qty 
			FROM				Mas_Dept				MD		(nolock)
			RIGHT OUTER JOIN	BudPodet				BPD		(nolock)
			INNER JOIN			BudPoMas				BPM		(nolock)	ON	BPD.Id		= BPM.Id 
			RIGHT OUTER JOIN	Trs_ProdentryQty		TPQ		(nolock)
			INNER JOIN			Trs_Prodentry			TP		(nolock)	ON	TPQ.id		= TP.id 
			INNER JOIN			Mas_JobWrkComp			MJW		(nolock)	ON	TP.StageID	= MJW.Id		ON		BPD.Size	=	TPQ.SizId 
			AND					BPD.ColId				=		TP.ClrId	AND BPD.PartId	= TP.PartId		AND		BPM.DeptId	=	TP.StageID 
			AND					BPM.OrdId				=		TP.OrdId	AND BPD.StyleNo = TP.StyleNo	ON		MD.DeptID	=	MJW.DeptId 
			LEFT OUTER JOIN		Trs_ProdExp				TPE		(nolock)	ON	TP.StyleNo	= TPE.StyleNo	AND		TP.StageID	=	TPE.WrkID 
			AND					TP.OrdId				=		TPE.OrdId  
			LEFT OUTER JOIN		Pro_Prod_PartwiseRate	PPPR	(nolock)	ON	TPE.OrdId	= PPPR.OrdID	AND		TPE.StyleNo =	PPPR.StyleNo 
			AND					TPE.WrkId				=		PPPR.WrkID	AND TP.PartId	= PPPR.PartID	
			WHERE	(TP.ReWork		=	1   And TP.OrdId  in(select id from fnSplitter(@OrdID)))
			or		(BPM.RateType_Prs_REWORK = 'R' And TP.OrdId  in(select id from fnSplitter(@OrdID)))
			)as A 
		Group by Ordid, Deptid ,StageID 		
		)
		
		
		insert into Temp_BudgetAndActual(
				Guid,slno		,ordid		,DeptID		,budgetqty	,budgetamt	,ActualQty	,ActualAmt	,StageID	)
		select @Guid,cte.Slno	,cte.ordid	,cte.Deptid	,0			,0			,cte.ActQty	,cte.ActAmt	,cte.StID
		from		cte
		Left OUTER JOIN Temp_BudgetAndActual tmp
		on		cte.ordid		=	tmp.ordid
		and		cte.Deptid		=	tmp.Deptid
		and		cte.StID		=	tmp.StageID
		and		cte.Slno		=	tmp.Slno
		where   tmp.DeptId IS NULL


		
		
/* 'For Commerical */
		insert into Temp_BudgetAndActual(
		Guid,	slno,		ordid,					budgetqty,	budgetamt,		ActualQty,	ActualAmt,
		Type,										Description)
		SELECT     
		@Guid, 5,	BC.OrdID, null,		null,				null,		null, 
		ISNULL(MC.Type, '-') AS Type,	MC.Descr
		FROM		PRo_BudCommercial	BC (nolock)
		INNER JOIN	Mas_Commercial		MC (nolock)
		ON			BC.ComID	=		MC.ID  
		and			BC.OrdID	in	    (select id from fnSplitter(@OrdID))

         ;with   cte(ordid,budqty,budamt,comdesc) as  
         (
			SELECT     BC.OrdID,Isnull(sum( QD.CutPlanQty),0) AS budgetqty,
			--case  rtrim(MC.Pers_PerPcs) 
			--when '%' then isnull(sum(QD.orderqty),0)*BC.Val
			--when 'P' then ISNULL(Sum(QD.OrderQty * SaleRate * isnull(OM.Crate,0)),0)/100 * BC.Per
			--else BC.Total 
			--end  
			BC.total as budgetamt,MC.Descr 
			FROM			PRo_BudCommercial BC	(nolock)
			INNER JOIN		Mas_Commercial MC		(nolock)	ON BC.ComID =	MC.ID  and BC.OrdID in (select id from fnSplitter(@OrdID))
			LEFT OUTER JOIN OrderMas OM				(nolock)	ON OM.OrdId =	BC.OrdID
			LEFT OUTER JOIN OrderQtyDtl QD			(nolock)	ON OM.OrdId =	QD.OrdID 
			where BC.OrdID in(select id from fnSplitter(@OrdID))
			GROUP BY BC.Total,MC.Pers_PerPcs,BC.OrdID, MC.Type, MC.Descr, BC.Per, BC.Val, MC.ID    
		 )
		
			update	tmp
			set		budgetqty		=	budqty,
					budgetamt		=	budamt
			From	Temp_BudgetAndActual tmp 
			join	cte 
			on		tmp.ordid		= cte.ordid
			and		tmp.Description = cte.comdesc
			and		tmp.slno			= 5
			where	tmp.guid		= @guid 	
		
			;with   cte(ordid,actqty,actamt,comdesc) as  
			(
				SELECT BC.OrdID,
				case when isnull(SUM(SD.BillAmount), 0) >0 then   ISNULL(SUM(TP2.Pcs), 0) else 0 end AS ActualQty, 
				isnull(SUM(SD.BillAmount), 0) AS ActualAmt, MC.Descr AS Description
				FROM			PRo_BudCommercial BC	(nolock)
				INNER JOIN		Mas_Commercial MC		(nolock)	ON BC.ComID	= MC.ID			and BC.OrdID	IN(select id from fnSplitter(@OrdID))
				inner join      ShippingBill  SB        (nolock)    on sb.ComID = BC.ComID
				LEFT OUTER JOIN ShippingBill_Det SD		(nolock)	ON SD.Ordid	= BC.OrdID and sb.id = sd.Cid
				LEFT OUTER JOIN Trs_Pcs1 TP1			(nolock)	ON BC.OrdID	= TP1.Ordjobno	and TP1.DelType = 'Despatch'
				LEFT OUTER JOIN Trs_Pcs2 TP2			(nolock)	ON TP1.ID	= TP2.ID  
				and TP1.Ordjobno = BC.OrdId 
				where BC.OrdID in(select id from fnSplitter(@OrdID)) 
				GROUP BY BC.OrdID,  MC.Descr

			)
		update	tmp
		set		ActualQty	=	actqty,
				ActualAmt	=	actamt
		From	Temp_BudgetAndActual tmp 
		join	cte 
		on		tmp.ordid		= cte.ordid
		and		tmp.Description = cte.comdesc
		and		tmp.slno			= 5
		where	tmp.guid		= @guid 	
		

/* Bills==>Expenses Amount Are Must Be Displayed in Report if is not in Budget commercial*/

		insert into Temp_BudgetAndActual
		(		Guid,slno	,ordid,ActualQty,ActualAmt	,Type,Description	,budgetqty	,budgetamt)
		Select @Guid,5		,Ordid,0		,sum(Amount),Type,Descr			,0			,0
		from		Trs_Expenses	TE	(nolock)
		inner join  Mas_commercial	MC	(nolock)	on TE.Expid	=	MC.id 
		where ordid in(select id from fnSplitter(@OrdID)) Group by Ordid,Descr,Type


/*Add Actual Amount Details
		Instead of Amount -> NetAmount Taken NetAmount=Amount+Tax Cal*/
		;with   cte(ordid,actqty,actamt,DeptID) as  
		(
			SELECT   TBR.OrdID, ISNULL(SUM(TBR.Kgs), 0),SUM(TBR.NetAmount),TBR.dept 
			FROM        Trs_Bills				TB	(nolock)
			INNER JOIN  Trs_BillRate			TBR	(nolock)	ON TB.ID = TBR.ID 
			INNER JOIN  Temp_BudgetAndActual	TDA	(nolock)	ON TBR.dept = TDA.DeptID and TBR.OrdID = TDA.OrdId
			WHERE		TBR.OrdID		in	(select id from fnSplitter(@OrdID)) and TDA.Slno =1 and tda.guid = @guid
			GROUP BY	TBR.OrdID,	TBR.dept
		)
		update tmp 
		set		ActualQty	=	actqty,
				ActualAmt	=	actamt 
		from	Temp_BudgetAndActual tmp
		join	cte 
		on		tmp.ordid	= cte.ordid
		and		tmp.DeptID	= cte.DeptID
		where	tmp.guid	= @guid and slno=1

		
/* Opening Stock - rk*/
		;with   cte(ordid,actqty,actamt,DeptID) as  
		(
			select OP.OrdID,Isnull(Sum(kgs),0)  as TotKg , Isnull(SUM(kgs*Rate),0) as totAmt ,Dept 
			FROM		Trs_Opening				OP	(nolock)
			INNER JOIN  Temp_BudgetAndActual	TDA	(nolock)	ON OP.dept = TDA.DeptID 
			where OP.OrdID in (select id from fnSplitter(@OrdID)) AND TDA.Slno =1 and tda.guid = @guid
			group by OP.OrdID,Dept
		)
		
		update tmp 
		set		ActualQty	=	ActualQty + actqty,
				ActualAmt	=	ActualAmt + actamt 
		from	Temp_BudgetAndActual tmp
		join	cte 
		on		tmp.ordid	= cte.ordid
		and		tmp.DeptID	= cte.DeptID
		where	tmp.guid	= @guid and slno=1	
		
/*Transfer In*/	
		;with   cte(ordid,actqty,actamt,DeptID) as  
		(
		select tranordid,Isnull(Sum(Kg),0) TotKg, Isnull(Sum(Kg*Rate),0) TotAmt,prs_dept 
		from		trs_del1				TD1	(nolock)
		inner join	trs_del2				TD2	(nolock)	on TD1.id = TD2.id 
		INNER JOIN  Temp_BudgetAndActual	TDA	(nolock)	ON TD1.Prs_Dept = TDA.DeptID 
		where tranordid in (select id from fnSplitter(@OrdID))  AND TDA.Slno =1 and tda.guid = @guid
		group by tranordid,prs_dept
		)

		update tmp 
		set		ActualQty	=	ActualQty + actqty,
				ActualAmt	=	ActualAmt + actamt 
		from	Temp_BudgetAndActual tmp
		join	cte 
		on		tmp.ordid	= cte.ordid
		and		tmp.DeptID	= cte.DeptID
		where	tmp.guid	= @guid and slno=1	
/*Transfer out*/
		;with   cte(ordid,actqty,actamt,DeptID) as  
		(
		select TD2.ordid,Isnull(Sum(Kg),0) TotKg, Isnull(Sum(Kg*Rate),0) TotAmt ,prs_dept
		from		trs_del1 TD1				(nolock)
		inner join	trs_del2 TD2				(nolock)	on TD1.id = TD2.id 
		INNER JOIN  Temp_BudgetAndActual	TDA	(nolock)	ON TD1.Prs_Dept = TDA.DeptID 
		where trtype in (3,8) AND TD2.ordid in (select id from fnSplitter(@OrdID))  AND TDA.Slno =1 and tda.guid = @guid
		group by TD2.ordid,prs_dept
		)

		update tmp 
		set		ActualQty	=	ActualQty + actqty,
				ActualAmt	=	ActualAmt + actamt 
		from	Temp_BudgetAndActual tmp
		join	cte 
		on		tmp.ordid	= cte.ordid
		and		tmp.DeptID	= cte.DeptID
		where	tmp.guid	= @guid 	and slno=1
		
/* For Actual Pcs Forms */
		;with   cte(ordid,actqty,actamt,DeptID) as  
		(
			SELECT BR.OrdID ,ISNULL(SUM(BR.Mtr), 0) AS ActKgs, SUM(BR.Amount) AS Amount, BR.dept 
			FROM		Trs_Bills		TB			(nolock)
			INNER JOIN  Trs_BillRate	BR			(nolock)	ON	TB.ID = BR.ID 
			INNER JOIN  Temp_BudgetAndActual	TDA	(nolock)	ON BR.dept = TDA.DeptID 
			WHERE		BR.OrdID in (select id from fnSplitter(@OrdID))  AND TDA.Slno =2 and tda.guid = @guid
			GROUP BY	BR.OrdID ,BR.dept		
		)

		update tmp 
		set		ActualQty	=	ActualQty + actqty,
				ActualAmt	=	ActualAmt + actamt 
		from	Temp_BudgetAndActual tmp
		join	cte 
		on		tmp.ordid	= cte.ordid
		and		tmp.DeptID	= cte.DeptID
		where	tmp.guid	= @guid and slno=2
		
/* For Dept Act.Bill Amount not in bud. Entry */	
		insert into Temp_BudgetAndActual
		(		Guid,slno	,ordid		,deptid		,ActualQty					,ActualAmt)
		SELECT @Guid,1		,TBR.OrdID	,TBR.dept	,ISNULL(SUM(TBR.Kgs), 0)	,SUM(TBR.Amount)	
		FROM        Trs_Bills		TB		(nolock)
		INNER JOIN	Trs_BillRate	TBR		(nolock)	ON	TB.ID = TBR.ID 
		inner join	Mas_Dept		MD		(nolock)	ON	TBR.dept=MD.Deptid  
		WHERE		TBR.OrdID  in (select id from fnSplitter(@OrdID)) 
		AND (TBR.dept  not in ( Select Distinct Deptid from Temp_BudgetAndActual (nolock) where Deptid is not null )) And MD.outputtype in('Y','F','-') 
		GROUP BY TBR.dept,TBR.OrdID
		
		insert into Temp_BudgetAndActual
		(		Guid,slno,ordid		,deptid		,ActualQty				,ActualAmt		) 
		SELECT @Guid,2	 ,TBR.OrdID ,TBR.dept	,ISNULL(SUM(TBR.Mtr), 0),SUM(TBR.Amount)
		FROM		Trs_Bills		TB		(nolock)
		INNER JOIN  Trs_BillRate	TBR		(nolock)	ON	TB.ID		=	TBR.ID 
		inner join  Mas_Dept		MD		(nolock)	ON	TBR.dept	=	MD.Deptid  
		WHERE     	TBR.OrdID  in (select id from fnSplitter(@OrdID))  
		AND			TBR.dept  not in ( Select Distinct Deptid from Temp_BudgetAndActual (nolock) where Deptid is not null )	And MD.outputtype in('P') 
		GROUP BY	TBR.dept,TBR.OrdID
		
/*For Yarn ANd Fabric Sales and Job Wrk Invoice
            'For separate yanr & fabric*/
		
		;with   cte(
				Guid,Slno,ordid		,DeptID		,ActQty						,ActAmt										) as  
		(
		SELECT @Guid,1	 ,Trs_Del2.OrdID ,Prs_Dept	,isnull(SUM(Trs_Del2.Kg),0) ,isnull(SUM(Trs_Del2.Kg * Trs_Del2.rate),0) 
		FROM Trs_Del1 INNER JOIN Trs_Del2 ON Trs_Del1.ID = Trs_Del2.ID 
		WHERE ISNULL(Trs_Del1.InvId, 0) <> 0 AND Trs_Del2.OrdID in (select id from fnSplitter(@OrdID))  
		Group By Prs_Dept,Trs_Del2.OrdID
	)
		update	tmp
		set		ActualQty		=	ActualQty -	ActQty,
				ActualAmt		=	ActualAmt -	ActAmt
		From	Temp_BudgetAndActual tmp 
		join	cte 
		on		tmp.ordid		=	cte.ordid
		and		tmp.Deptid		=	cte.Deptid
		and		tmp.Slno		=	cte.Slno
		where	tmp.guid		=	@guid	
		
		;with   cte(
				Guid,Slno,ordid				,DeptID	,ActQty						,ActAmt										) as  
		(
		Select  @Guid,2	 ,Trs_Pcs1.Ordjobno	,Dept	,ISNULL(SUM(Trs_Pcs2.Pcs),0), ISNULL(SUM(Trs_Pcs2.Pcs * Trs_Pcs1.JRate),0)
		FROM Trs_Pcs1 INNER JOIN Trs_Pcs2 ON Trs_Pcs1.ID = Trs_Pcs2.ID 
		WHERE ISNULL(Trs_Pcs1.InvID, 0) <> 0 AND Trs_Pcs1.Ordjobno  in (select id from fnSplitter(@OrdID)) 
		Group by Dept,Trs_Pcs1.Ordjobno
			)
		update	tmp
		set		ActualQty		=	ActualQty -	ActQty,
				ActualAmt		=	ActualAmt -	ActAmt
		From	Temp_BudgetAndActual tmp 
		join	cte 
		on		tmp.ordid		=	cte.ordid
		and		tmp.Deptid		=	cte.Deptid
		and		tmp.Slno		=	cte.Slno
		where	tmp.guid		=	@guid	
            


Set Nocount off	
end --B0