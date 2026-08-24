/*  
;=============================================  
; Author	   :  Global Software's  
; Create date	   :  16/02/2018  
; Create By		   :  ASLAM
; Description	   :  UpdateMeeting
; Change Person	   :  ASLAM
; Last Change Date :  16/02/2018 07.00
; =============================================  */

CREATE PROCEDURE [dbo].[UpdateMeeting_Posting] (@Ordid int,@DeptID int,@Styleno Varchar(50))
As
BEGIN

	SET NOCOUNT ON;

	Delete from MR_Fabric where Ordid = @Ordid And DeptId = @DeptID 
    Insert into MR_Fabric select X.OrdId,isNull(OQ.Sl,MD.OrderSno) as Sl,X.DeptId,Dept = Case when X.OutputType = 'F' and X.DeptID = 11 then 'CUT(LOT)' 
	    else MD.ShortDept End,SUM(IsNull(ReqQty,0)) AS ProgQty,0 as OutQty, SUM(Isnull(GrnQty,0)) AS InQty,Null,Null,Null,Null,'',0 from 
		(select RY.OrdID,(D.DeptId) AS DeptID,D.OutputType,SUM(IsNull(RY.ReqKgs,0)) AS ReqQty,0 AS GrnQty from Pro_ReqYarn RY INNER JOIN Mas_Dept D 
		ON RY.DeptID=D.DeptID and D.OutputType='Y' WHERE Ry.OrdId = @Ordid And Ry.DeptId = @DeptID group by RY.OrdId,D.DeptId,D.OutputType  
		UNION  
		select TG2.OrdID,(D.DeptId) AS DeptID,D.OutputType,0 AS ReqQty,SUM(Isnull(TG2.RecKgs,0)) AS GrnQty from Trs_Grn2 TG2   
		INNER JOIN Trs_Grn1 TG1 ON TG2.ID=TG1.ID  INNER JOIN Mas_Dept D ON TG1.Dept=D.DeptID and TG1.GRNType IN ('Purchase','Process') and D.OutputType='Y' WHERE TG2.OrdId = @Ordid And TG1.Dept = @DeptID
		group by TG2.OrdId,D.DeptId,D.OutputType  
		UNION  
		select RK.OrdID,(D.DeptId) AS DeptID,D.OutputType,SUM(Isnull(RK.ReqKgs,0)) AS ReqQty,0 AS GrnQty 
		from Pro_ReqKnitt RK  INNER JOIN Mas_Dept D ON RK.DeptId=D.DeptID and D.OutputType='F' 
		WHERE Rk.OrdId = @Ordid And Rk.DeptId = @DeptID
		group by RK.OrdId,D.DeptId,D.OutputType  
		UNION  
		select TG2.OrdID,(D.DeptId) AS DeptID,D.OutputType,0 AS ReqQty,SUM(Isnull(TG2.RecKgs,0)) AS GrnQty 
		from Trs_Grn2 TG2 INNER JOIN Trs_Grn1 TG1 ON TG2.ID=TG1.ID INNER JOIN Mas_Dept D ON TG1.Dept=D.DeptID and TG1.GRNType IN ('Purchase','Process')   
		and D.OutputType='F' WHERE TG2.OrdId = @Ordid And TG1.Dept = @DeptID  group by TG2.OrdId,D.DeptId,D.OutputType  
		UNION  
		select Trs_Del2.TranOrdID AS OrdID,(D.DeptId) AS DeptID,D.OutputType,0 AS ReqQty, SUM(Isnull(Trs_Del2.Kg,0)) AS GrnQty from Trs_Del2 INNER JOIN Trs_Del1 
		ON Trs_Del2.ID=Trs_Del1.ID INNER JOIN Mas_Dept D ON Trs_Del1.Prs_Dept=D.DeptID where Trs_Del1.TrType=3 and D.OutputType='F' 
		and Trs_Del2.TranOrdID = @Ordid And D.DeptId = @DeptID
		group by Trs_Del2.TranOrdID,D.DeptId,D.OutputType 
		UNION  
		select RK.OrdID,(D.DeptId) AS DeptID,D.InputType,SUM(Isnull(RK.ReqKgs,0)) + SUM(Isnull(shortKgs,0)) AS ReqQty,0 AS GrnQty from Pro_ReqKnitt RK  INNER JOIN Mas_Dept D 
		ON RK.DeptId=D.DeptID and D.InputType='F' WHERE Rk.OrdId = @Ordid And Rk.DeptId = @DeptID
		group by RK.OrdId,D.DeptId,D.InputType  
		UNION  
		select TG2.OrdID,(D.DeptId) AS DeptID,D.InputType,0 AS ReqQty,
		SUM(Isnull(TG2.RecKgs,0)) AS GrnQty from Trs_Grn2 TG2 INNER JOIN Trs_Grn1 TG1 ON TG2.ID=TG1.ID INNER JOIN Mas_Dept D ON TG1.Dept=D.DeptID and TG1.GRNType 
		IN ('Purchase','Process')   and D.InputType='F'  WHERE TG2.OrdId = @Ordid And D.DeptId = @DeptID group by TG2.OrdId,D.DeptId,D.InputType 
		UNION  
		select Trs_Del2.TranOrdID AS OrdID,(D.DeptId) AS DeptID,D.InputType,0 AS ReqQty,
		SUM(Isnull(Trs_Del2.Kg,0)) AS GrnQty from Trs_Del2 INNER JOIN Trs_Del1 ON Trs_Del2.ID=Trs_Del1.ID INNER JOIN Mas_Dept D ON Trs_Del1.Prs_Dept=D.DeptID 
		where Trs_Del1.TrType=3 and D.InputType='F' And  Trs_Del2.TranOrdID = @Ordid And D.DeptId = @DeptID  group by Trs_Del2.TranOrdID,D.DeptId,D.InputType 
		UNION 
		select Trs_Del2.TranOrdID AS OrdID,(D.DeptId) AS DeptID,D.OutputType,0 AS ReqQty, SUM(Isnull(Trs_Del2.Kg,0))  AS GrnQty from Trs_Del2 INNER JOIN Trs_Del1 
		ON Trs_Del2.ID=Trs_Del1.ID  INNER JOIN Mas_Dept D ON Trs_Del1.Prs_Dept=D.DeptID where Trs_Del1.TrType=3 and D.OutputType='Y' 
		AND Trs_Del2.TranOrdId = @Ordid And D.DeptId = @DeptID
		group by Trs_Del2.TranOrdID,D.DeptId,D.OutputType)X INNER JOIN Mas_Dept MD ON X.DeptId=MD.DeptId LEFT OUTER JOIN OrdSeq OQ ON X.OrdId=OQ.OrdId AND X.DeptId=OQ.Prs WHERE X.OrdId = @Ordid And X.DeptId = @DeptID
		group by X.OrdId,OQ.Sl,MD.OrderSno,X.DeptId,MD.DeptName,MD.ShortDept,X.OutputType Order by x.OrdId 

        Update MR_Fabric set InQty = (SELECT CONVERT(NUMERIC(18,1),Isnull(sum(IsNull(kg,0)),0)) AS Qty FROM Trs_Del1 INNER JOIN Trs_Del2 ON Trs_Del1.ID=Trs_Del2.ID WHERE ProcessType='P' and TrType=1 and Trs_Del2.ordid=MR_Fabric.OrdId and prs_dept= MR_Fabric.DeptId) where(MR_Fabric.DeptId = 11)  And MR_Fabric.OrdId = @Ordid and MR_Fabric.DeptId =@DeptID 

		Update MR_Fabric set OutQty = case when tod.DeptId = 11  then (select CONVERT(NUMERIC(18,1),Isnull(Sum(Isnull(reqkgs,0)),0) + IsNull(Sum(Isnull(shortKgs,0)),0)) from Pro_ReqKnitt where Pro_ReqKnitt.OrdId = tod.ordId and DeptId = tod.DeptId) Else (SELECT CONVERT(NUMERIC(18,1), IsNull(Sum(Isnull(kg,0)),0)) + (select Isnull(sum(Isnull(b.Pcs,0)),0) from Trs_Pcs1 a inner join Trs_Pcs2 b on a.id = b.id where a.Ordjobno = tod.ordId and Dept = tod.DeptId) AS Qty FROM Trs_Del1 INNER JOIN Trs_Del2 ON Trs_Del1.ID=Trs_Del2.ID WHERE  ProcessType='P' and TrType=1 AND Trs_Del2.ordid=tod.ordId and prs_dept=tod.DeptId) End from MR_Fabric tod where ordId= tod.OrdId and seqno = tod.SeqNo and deptid = tod.DeptId
		and tod.OrdId = @Ordid And tod.DeptId = @DeptID


        Update MR_Fabric set POQty = (SELECT CONVERT(NUMERIC(18,1),Isnull(sum(ISNULL(poqty,0)),0)) AS Qty FROM Trs_Po2 INNER JOIN Trs_Po1 on Trs_Po1.ID=Trs_Po2.ID WHERE OrdId=tod.ordId and Dept=tod.DeptId) + (SELECT CONVERT(NUMERIC(18,1),Isnull(sum(ISNULL(PoKgs,0)),0)) AS Qty  FROM Trs_Po3 INNER JOIN Trs_Po1 on Trs_Po1.ID=Trs_Po3.ID WHERE trs_Po3.OrdId=tod.ordId and Trs_Po1.Dept=tod.DeptId) from MR_Fabric tod where ordId= tod.OrdId and seqno = tod.SeqNo and deptid = tod.DeptId and tod.OrdId = @Ordid And tod.DeptId = @DeptID

		Update MR_Fabric set PlanStart =case when convert(varchar(10),vw_Trs_ScheduleNew.PlanStart,103) = '01/01/1900' then Null Else vw_Trs_ScheduleNew.PlanStart End from vw_Trs_ScheduleNew where MR_Fabric.OrdId = vw_Trs_ScheduleNew.OrdId and MR_Fabric.DeptId = vw_Trs_ScheduleNew.DeptId and MR_Fabric.seqNo = vw_Trs_ScheduleNew.sl and vw_Trs_ScheduleNew.PlanStart is not null
		and MR_Fabric.OrdId = @Ordid And MR_Fabric.DeptId = @DeptID

		Update MR_Fabric set PlanFinish = case when convert(varchar(10),vw_Trs_ScheduleNew.Planfinish,103) = '01/01/1900' then Null else vw_Trs_ScheduleNew.Planfinish End from vw_Trs_ScheduleNew where MR_Fabric.OrdId = vw_Trs_ScheduleNew.OrdId and MR_Fabric.DeptId = vw_Trs_ScheduleNew.DeptId and MR_Fabric.seqNo = vw_Trs_ScheduleNew.sl and vw_Trs_ScheduleNew.Planfinish is not null
		and MR_Fabric.OrdId = @Ordid And MR_Fabric.DeptId = @DeptID


		Update MR_Fabric set ActualStart =  case when convert(varchar(10),vw_Trs_ScheduleNew.ActStart,103) = '01/01/1900' then Null else vw_Trs_ScheduleNew.ActStart End from vw_Trs_ScheduleNew where MR_Fabric.OrdId = vw_Trs_ScheduleNew.OrdId and MR_Fabric.DeptId = vw_Trs_ScheduleNew.DeptId and MR_Fabric.seqNo = vw_Trs_ScheduleNew.sl and vw_Trs_ScheduleNew.ActStart is not null
		and MR_Fabric.OrdId = @Ordid And MR_Fabric.DeptId = @DeptID

        Update MR_Fabric Set ActualFinish = case when ActualStart is not null then case when (case when Convert(Numeric(18,3),isnull(MR.ProgQty,1)) = 0 then 0 else Rtrim(convert(Numeric(18,0),((Convert(Numeric(18,3),(isnull(Mr.InQty,0))*100))/Convert(Numeric(18,3),isnull(MR.ProgQty,1))))) End) > 95 then (Select max(IsNull(Dt,'')) From (select max(IsNull(Trs1.dt,'')) as Dt from trs_grn1 Trs1 inner join trs_grn2 Trs2 on Trs1.Id = Trs2.id INNER JOIN StockTable ON Trs2.StockID = StockTable.StockId INNER JOIN Mas_Dept D ON Trs1.Dept=D.DeptID where Trs2.ordid = MR.ordid and Trs1.dept = MR.DeptId and Trs1.GrnType in ('Purchase', 'Process') and isnull(Trs1.ProcessType,'P') <> 'R' Union select max(IsNull(Trs1.dt,'')) as Dt from trs_grn1 Trs1 inner join trs_grn2 Trs2 on Trs1.Id = Trs2.id INNER JOIN StockTable ON Trs2.StockID = StockTable.StockId INNER JOIN Mas_Dept D ON Trs1.Dept=D.DeptID where Trs2.ordid = MR.ordid and Trs1.dept = MR.DeptId and Trs1.GrnType in ('Purchase', 'Process')  and D.OutputType='F' Union select max(IsNull(Trs1.dt,'')) as Dt from trs_grn1 Trs1 inner join trs_grn2 Trs2 on Trs1.Id = Trs2.id INNER JOIN StockTable ON Trs2.StockID = StockTable.StockId INNER JOIN Mas_Dept D ON Trs1.Dept=D.DeptID where Trs2.ordid = MR.ordid and Trs1.dept = MR.DeptId and Trs1.GrnType in ('Purchase', 'Process')  and D.InputType='F' Union select max(IsNull(Trs1.dt,'')) as Dt from trs_grn1 Trs1 inner join trs_grn2 Trs2 on Trs1.Id = Trs2.id INNER JOIN StockTable ON Trs2.StockID = StockTable.StockId INNER JOIN Mas_Dept D ON Trs1.Dept=D.DeptID where Trs2.ordid = MR.ordid and Trs1.dept = MR.DeptId and Trs1.GrnType in ('Purchase', 'Process')  and D.OutputType='Y' Union Select max(IsNull(OpenDt,'')) as Dt From Trs_Opening Inner join StockTable On Trs_Opening.StockID = StockTable.StockId Where Trs_Opening.Ordid = MR.ordid AND Trs_Opening.Dept = MR.DeptId)D) else Null End End from mr_fabric MR inner join trs_grn2 b on MR.OrdId = b.ordid inner join trs_grn1 a on a.id =b.id and a.Dept = MR.DeptId WHERE  MR.OrdId = @Ordid And MR.DeptId = @DeptID


        Update MR_Fabric Set ActualFinish = case when ActualStart is not null then case when (case when Convert(Numeric(18,3),isnull(MR.ProgQty,1)) = 0 then 0 else Rtrim(convert(Numeric(18,0),((Convert(Numeric(18,3),(isnull(Mr.InQty,0))*100))/Convert(Numeric(18,3),isnull(MR.ProgQty,1))))) End) > 95 then (Select max(IsNull(Dt,'')) From (select  max(IsNull(Trs_del1.Dt,'')) as Dt  from Trs_Del2 INNER JOIN Trs_Del1 ON Trs_Del2.ID=Trs_Del1.ID  INNER JOIN Mas_Dept D ON Trs_Del1.Prs_Dept=D.DeptID and Trs_del2.TranOrdId = MR.ordid and Trs_Del1.Prs_Dept = MR.DeptId)D)else Null End End from mr_fabric MR inner join Trs_del2 b on MR.OrdId = b.TranOrdId inner join Trs_Del1 a on a.ID=b.ID and a.Prs_Dept = MR.DeptId INNER JOIN Mas_Dept D ON a.Prs_Dept=D.DeptID and a.TrType=3 and D.OutputType='Y'
		WHERE MR.OrdId = @Ordid And MR.DeptId = @DeptID

        Update MR_Fabric Set ActualFinish = case when ActualStart is not null then case when (case when Convert(Numeric(18,3),isnull(MR.ProgQty,1)) = 0 then 0 else Rtrim(convert(Numeric(18,0),((Convert(Numeric(18,3),(isnull(Mr.InQty,0))*100))/Convert(Numeric(18,3),isnull(MR.ProgQty,1))))) End) > 95 then (Select max(IsNull(Dt,'')) From (select  max(IsNull(Trs_del1.Dt,'')) as Dt  from Trs_Del2 INNER JOIN Trs_Del1 ON Trs_Del2.ID=Trs_Del1.ID  INNER JOIN Mas_Dept D ON Trs_Del1.Prs_Dept=D.DeptID and Trs_del2.TranOrdId = MR.ordid and Trs_Del1.Prs_Dept = MR.DeptId)D)else Null End End from mr_fabric MR inner join Trs_del2 b on MR.OrdId = b.TranOrdId inner join Trs_Del1 a on a.ID=b.ID and a.Prs_Dept = MR.DeptId INNER JOIN Mas_Dept D ON a.Prs_Dept=D.DeptID and a.TrType=3 and D.OutputType='F'
		WHERE MR.OrdId = @Ordid And MR.DeptId = @DeptID

        Update MR_Fabric Set ActualFinish = case when ActualStart is not null then case when (case when Convert(Numeric(18,3),isnull(MR.ProgQty,1)) = 0 then 0 else Rtrim(convert(Numeric(18,0),((Convert(Numeric(18,3),(isnull(Mr.InQty,0))*100))/Convert(Numeric(18,3),isnull(MR.ProgQty,1))))) End) > 95 then (Select max(IsNull(Dt,'')) From (select  max(IsNull(Trs_del1.Dt,'')) as Dt  from Trs_Del2 INNER JOIN Trs_Del1 ON Trs_Del2.ID=Trs_Del1.ID  INNER JOIN Mas_Dept D ON Trs_Del1.Prs_Dept=D.DeptID and Trs_del2.TranOrdId = MR.ordid and Trs_Del1.Prs_Dept = MR.DeptId)D)else Null End End from mr_fabric MR inner join Trs_del2 b on MR.OrdId = b.TranOrdId inner join Trs_Del1 a on a.ID=b.ID and a.Prs_Dept = MR.DeptId INNER JOIN Mas_Dept D ON a.Prs_Dept=D.DeptID and a.TrType=3 and D.InputType='F'
		WHERE MR.OrdId = @Ordid And MR.DeptId = @DeptID

        Update MR_Fabric Set ActualFinish = case when ActualStart is not null then case when (case when Convert(Numeric(18,3),isnull(MR.ProgQty,1)) = 0 then 0 else Rtrim(convert(Numeric(18,0),((Convert(Numeric(18,3),(isnull(Mr.InQty,0))*100))/Convert(Numeric(18,3),isnull(MR.ProgQty,1))))) End) > 95 then (Select max(IsNull(Dt,'')) From (SELECT max(IsNull(Trs_del1.Dt,'')) as Dt  FROM Trs_Del2 INNER JOIN Trs_Del1 ON Trs_Del1.ID=Trs_Del2.ID INNER JOIN Mas_Dept D ON Trs_Del1.Prs_Dept=D.DeptID and Trs_Del2.Ordid= Mr.OrdId and Trs_Del1.Prs_Dept = 11 and Trs_Del1.TrType = 1)D)else Null End End from mr_fabric MR inner join Trs_del2 b on MR.OrdId = b.ordid inner join Trs_Del1 a on a.ID=b.ID and a.Prs_Dept = MR.DeptId INNER JOIN Mas_Dept D ON a.Prs_Dept=D.DeptID and ProcessType='P' and a.TrType=1 and MR.DeptId = 11
		WHERE MR.OrdId = @Ordid 

		Update MR_Fabric set BGColor = case when Planstart is not Null and PlanFinish is not Null then Case When ActualFinish is not Null then Case when DateDiff(dd,PlanFinish,ActualFinish) <= 0 then 'Green' else 'LightGreen' End when ActualStart is not Null and ActualFinish is Null then case when DateDiff(dd,Planstart,ActualStart) <= 0 then 'Blue' when PlanFinish > = getdate() then 'LightBlue' when PlanFinish < getdate() then 'Red' End When ActualStart is Null then case when PlanFinish > = getdate() then 'Silver' when PlanFinish < getdate() then 'Orange' End End End from MR_Fabric WHERE MR_Fabric.OrdId = @Ordid And MR_Fabric.DeptId = @DeptID
        
		Delete from MR_Production where  OrdID =@Ordid And StyleNo=@Styleno And  Deptid=@DeptID 

        Insert into MR_Production select X.OrdId,StyleNo,IsNull(OQ.Sl,MD.OrderSno) as Sl,X.DeptId,Dept = Case when X.DeptID = 11 then 'CUT(PCS)' else MD.ShortDept End,Null,sum(IsNull(ProdQty,0)) AS ProdQty,Null,Null,Null,Null,'',PartId from (SELECT PG1.OrdJob AS OrdId,PG2.StyleNo,D.DeptId,sum(IsNull(PG2.RecPcs,0)) AS ProdQty,IsNull(PG2.PARTID,0) as PartID FROM Trs_PcsGrn1 PG1 INNER JOIN Trs_PcsGrn2 PG2 ON PG1.ID = PG2.ID INNER JOIN Mas_Dept D ON PG1.dept=D.DeptId WHERE PG1.GrnType <> 'Process Return' AND D.OutputType='P' 
		and pg1.OrdJob =@Ordid And StyleNo=@Styleno And  Deptid=@DeptID 

		group by PG1.OrdJob,D.DeptId,D.OutputType,PG2.StyleNo,PG2.PARTID UNION Select x.OrdId,X.StyleNo, x.DeptID, Min(x.RecPcs) as ProdQty,X.PartID from (SELECT TP.OrdId,TP.StyleNo,D.DeptId,Sum(ISNULL(TPQ.ProdPcs,0)) AS RecPcs, Mas_Part.PartName,IsNull(Mas_Part.PartID,0) as PartID FROM Trs_prodentry TP INNER JOIN Trs_prodentryqty TPQ on TP.id = TPQ.id INNER JOIN Mas_JobWrkComp ON TP.StageID = Mas_JobWrkComp.id INNER JOIN Mas_Dept D ON Mas_JobWrkComp.DeptId=D.DeptId  INNER JOIN Mas_Part ON TP.PARTID = Mas_Part.PartID WHERE Rework=0 AND D.OutputType='P' and Mas_JobWrkComp.id = case when d.DeptID = '11' then 1 Else Mas_JobWrkComp.id end 
		And  TP.Ordid =@Ordid And StyleNo=@Styleno And  D.Deptid=@DeptID 

		group by TP.OrdId,D.DeptId,D.OutputType,Mas_Part.PartName,TP.StyleNo,Mas_Part.PartID)x group by x.OrdId, x.DeptID,X.StyleNo,X.PartID)X INNER JOIN Mas_Dept MD ON X.DeptId=MD.DeptId LEFT OUTER JOIN OrdSeq OQ ON X.OrdId=OQ.OrdId AND X.DeptId=OQ.Prs group by X.OrdId,OQ.Sl,MD.OrderSno,X.DeptId,MD.DeptName,MD.ShortDept,StyleNo,PartId 

        Update MR_Production set DCQty = case when tod.DeptId = 11 then (Select  CONVERT(NUMERIC(18,1),Isnull(Sum(Isnull(CutPlanQty,0)),0)) From OrderQtyDtl OD Where OD.OrdId=tod.ordId) Else (SELECT CONVERT(NUMERIC(18,1), IsNull(Sum(Isnull(kg,0)),0)) + (SELECT CONVERT(NUMERIC(18,1),Isnull(sum(Isnull(poqty,0)),0)) AS Qty FROM Trs_Po2 INNER JOIN Trs_Po1 on Trs_Po1.ID=Trs_Po2.ID WHERE OrdId=tod.ordId and Dept=tod.DeptId) + (select Isnull(sum(Isnull(b.Pcs,0)),0) from Trs_Pcs1 a inner join Trs_Pcs2 b on a.id = b.id where a.Ordjobno = tod.ordId and Dept = tod.DeptId) AS Qty FROM Trs_Del1 INNER JOIN Trs_Del2 ON Trs_Del1.ID=Trs_Del2.ID WHERE  ProcessType='P' and TrType=1 AND Trs_Del2.ordid=tod.ordId and prs_dept=tod.DeptId) End from MR_Production tod WHERE tod.OrdId =@Ordid And StyleNo=@Styleno And  Deptid=@DeptID 

        Update MR_Production set PlanStart =case when convert(varchar(10),vw_Trs_ScheduleNew.PlanStart,103) = '01/01/1900' then Null Else vw_Trs_ScheduleNew.PlanStart End from vw_Trs_ScheduleNew where MR_Production.OrdId = vw_Trs_ScheduleNew.OrdId  and MR_Production.DeptId = vw_Trs_ScheduleNew.DeptId and MR_Production.seqNo = vw_Trs_ScheduleNew.sl and vw_Trs_ScheduleNew.PlanStart is not null
		AND MR_Production.OrdId =@Ordid And StyleNo=@Styleno And  MR_Production.Deptid=@DeptID 

		Update MR_Production set PlanFinish = case when convert(varchar(10),vw_Trs_ScheduleNew.Planfinish,103) = '01/01/1900' then Null else vw_Trs_ScheduleNew.Planfinish End from vw_Trs_ScheduleNew where MR_Production.OrdId = vw_Trs_ScheduleNew.OrdId  and MR_Production.DeptId = vw_Trs_ScheduleNew.DeptId and MR_Production.seqNo = vw_Trs_ScheduleNew.sl  and vw_Trs_ScheduleNew.Planfinish is not null
		AND MR_Production.OrdId =@Ordid And StyleNo=@Styleno And  MR_Production.Deptid=@DeptID 

		Update MR_Production set ActualStart =  case when convert(varchar(10),vw_Trs_ScheduleNew.ActStart,103) = '01/01/1900' then Null else vw_Trs_ScheduleNew.ActStart End from vw_Trs_ScheduleNew where MR_Production.OrdId = vw_Trs_ScheduleNew.OrdId  and MR_Production.DeptId = vw_Trs_ScheduleNew.DeptId and MR_Production.seqNo = vw_Trs_ScheduleNew.sl and vw_Trs_ScheduleNew.ActStart is not null
		AND MR_Production.OrdId =@Ordid And StyleNo=@Styleno And  MR_Production.Deptid=@DeptID 

    	Update MR_Production set ActualFinish = case when ActualStart is not null then Case when (case when Convert(Numeric(18,3),isnull(MRS.StyleQty,1)) = 0 then 0 else Rtrim(convert(Numeric(18,0),((Convert(Numeric(18,3),(isnull(Mr.ProdQty,0))*100))/Convert(Numeric(18,3),isnull(MRS.StyleQty,1))))) End) > 95 then (Select max(IsNull(X.dt,'')) from (select max(Trs1.dt) as dt from Trs_PcsGrn1 Trs1 inner join Trs_PcsGrn2 Trs2 on Trs1.Id = Trs2.id where Trs1.Ordjob = MR.ordid and Trs1.dept = MR.DeptId and Trs2.StyleNo = MR.StyleNo and isnull(Trs1.ProcessType,'P') <> 'R' Union select max(Dt) as dt from Trs_Prodentry TP inner join Mas_JobWrkComp on Mas_JobWrkComp.id = TP.StageID where ordid = MR.ordid and TP.StyleNo = MR.StyleNo and Mas_JobWrkComp.DeptId = MR.DeptId)X) else Null End End from MR_Production MR Inner Join MR_Style MRS on MRS.OrdId = MR.OrdId and MRS.StyleNo = MR.StyleNo Left Outer join Trs_PcsGrn1 b on MR.OrdId = b.Ordjob and b.Dept = MR.DeptId Left Outer join Trs_PcsGrn2 a on a.id =b.id and a.StyleNo = Mr.StyleNo Left Outer join Trs_Prodentry c on c.OrdId = MR.OrdId and c.StyleNo = MR.StyleNo Left Outer Join Mas_JobWrkComp on Mas_JobWrkComp.id = c.StageID and Mas_JobWrkComp.DeptId = MR.DeptId 
		WHERE MR.OrdId =@Ordid And MR.StyleNo=@Styleno And  MR.Deptid=@DeptID 

		Update MR_Production set BGColor = case when Planstart is not Null and PlanFinish is not Null then Case When ActualFinish is not Null then Case when DateDiff(dd,PlanFinish,ActualFinish) <= 0 then 'Green' else 'LightGreen' End when ActualStart is not Null and ActualFinish is Null then case when DateDiff(dd,Planstart,ActualStart) <= 0 then 'Blue' when PlanFinish > = getdate() then 'LightBlue' when PlanFinish < getdate() then 'Red' End When ActualStart is Null then case when PlanFinish > = getdate() then 'Silver' when PlanFinish < getdate() then 'Orange' End End End from MR_Production WHERE MR_Production.Ordid =@Ordid And MR_Production.StyleNo=@Styleno And  MR_Production.Deptid=@DeptID 

        Delete from MR_Style WHERE Ordid = @Ordid And Styleno = @Styleno 

        Insert into MR_Style select OrderQtyDtl.Ordid,OrderQtyDtl.StyleNo,Sum(Isnull(OrderQtyDtl.OrderQty,0)) As StyleQty,0,0,0 from OrderQtyDtl inner join Ordermas on Ordermas.OrdId = OrderQtyDtl.OrdID WHERE OrderQtyDtl.Ordid = @Ordid And Styleno = @Styleno 
		group by OrderQtyDtl.Ordid,OrderQtyDtl.StyleNo 

        Update MR_Style Set CutPlanQty = (Select IsNull(Sum(Isnull(cutPlanQty,0)),0) from OrderQtyDtl where OrdId = MRS.OrdId and StyleNo = MRS.StyleNo) from MR_Style MRS WHERE MRS.Ordid= @Ordid And MRS.StyleNo = @Styleno 

        Update MR_Style Set CutPlanFabric = (select IsNull((sum(Isnull(ReqKgs,0))) + Isnull((sum(Isnull(ShortKgs,0))),0),0) from Pro_ReqKnitt where OrdId = MRS.OrdId and Deptid = 11) from MR_Style MRS WHERE MRS.Ordid= @Ordid And MRS.StyleNo = @Styleno 
        Update MR_Style Set CutActualFabric = (SELECT CONVERT(NUMERIC(18,1), Isnull(Sum(ISNULL(kg,0)),0)) AS Qty FROM Trs_Del1 INNER JOIN Trs_Del2 ON Trs_Del1.ID=Trs_Del2.ID WHERE  ProcessType='P' and TrType=1 AND Trs_Del2.ordid=MRS.OrdId and prs_dept=11) from MR_Style MRS
		WHERE MRS.Ordid= @Ordid And MRS.StyleNo = @Styleno 
    
	SET NOCOUNT OFF;
END
