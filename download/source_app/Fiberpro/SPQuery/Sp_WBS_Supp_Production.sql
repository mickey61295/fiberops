 /*                  

;=============================================                  

; Author  :  Global Software's                  

; Create date  :  01/Nov/2019                  

; Create By  :  ASLAM                  

; Description  :  Stored Procedure for Posting the Supplier Production Details for commando cloud

; Change Person  :  ASLAM                

; Last Change Date :  16/DEC/2025 11.55 AM                  

; =============================================   */ 

CREATE Procedure Sp_WBS_Supp_Production (@OrdId Int,@StyleNo Varchar(20),@SeqNo Int,@StageID int,@DeptId Int,@Dept Varchar(25),@DcQty Numeric (9,3),@ProdQty Numeric (9,3),@PlanStart DateTime,@PlanFinish DateTime,@ActualStart DateTime,@ActualFinish DateTime,@BGColor Varchar(50),@NewFlg Char(1),@EntryFlg Char(2),@PartId Int) As 



If @NewFlg='Y' 

Begin 

Insert Into WBS_Supp_Production (OrdId,StyleNo,SeqNo,StageId,DeptId,Dept,DcQty,ProdQty,PartId) Values (@OrdId,@StyleNo,@SeqNo,@StageID,@DeptId,@Dept,@DcQty,@ProdQty,@PartId) 

End 

Else 

If @EntryFlg='PD' 

Begin 

Update WBS_Supp_Production Set DcQty=@DcQty Where OrdId=@OrdId And StyleNo=@StyleNo And DeptId=@DeptId And PartId=@PartId and StageID = @StageID 

End 

Else 

If @EntryFlg='PR' 

Begin 

Update WBS_Supp_Production Set ProdQty=@ProdQty Where OrdId=@OrdId And StyleNo=@StyleNo And DeptId=@DeptId And PartId=@PartId And StageID = @StageID 

End 

Else 

If @EntryFlg='SC' Begin 

Update WBS_Supp_Production Set PlanStart=@PlanStart,PlanFinish=@PlanFinish Where OrdId=@OrdId And StyleNo=@StyleNo And DeptId=@DeptId and StageID = @StageID 

End 

Update WBS_Supp_Production Set BGColor = Case When PlanStart Is Not Null And PlanFinish Is Not Null Then Case When ActualFinish Is Not Null Then Case when DateDiff(dd,PlanFinish,ActualFinish) <= 0 Then 'Green' Else 'LightGreen' End When ActualStart Is Not
 Null

 And ActualFinish Is Null Then Case When DateDiff(dd,Planstart,ActualStart) <= 0 Then 'Blue' When PlanFinish >= GetDate() Then 'LightBlue' When PlanFinish < GetDate() Then 'Red' End When ActualStart Is Null Then Case When PlanFinish >= GetDate() Then 'Silver' When PlanFinish < GetDate() Then 'Orange' End End End From WBS_Supp_Production Where OrdId=@OrdId And StyleNo=@StyleNo And DeptId=@DeptId and stageID = @StageID









--Update WBS_Supp_Production SET OrderQty = x.Orderqty,OrderWithExsQty = X. CutPlanQty From  (

--Select Ordid,Styleno,Partid, IsNull(sum(Orderqty),0) as OrderQty, IsNull(sum(CutplanQty),0) as CutPlanQty from SuppOrdDet WHERE  Ordid = @Ordid and Styleno  = @StyleNo   group by Ordid,Styleno,PartId ) X INNER JOIN WBS_Supp_Production ON X.OrdID = WBS_Production.Ordid And X.StyleNo = WBS_Supp_Production.StyleNo and X.PartID = WBS_Supp_Production.PartId WHERE WBS_Supp_Production.PartID >0 and  WBS_Supp_Production.Ordid = @Ordid And WBS_Supp_Production.Styleno = @StyleNo 





Update WBS_Supp_Production SET OrderQty = x.Orderqty,OrderWithExsQty = X. CutPlanQty From  (

Select a.SuppOrdid as Ordid,B.Styleno, B.PartID, IsNull(sum(qty),0) as OrderQty, IsNull(sum(Qty),0) as CutPlanQty from SuppOrdMas A INNER JOIN SuppOrdDet B 

ON A.SuppOrdid = B.SuppOrdid INNER JOIN (Select Distinct Ordid,Styleno,PartId from OrderQtyDtl ) C ON C.ORdid = A.OrdId  and C.StyleNo = B.StyleNo  

  WHERE  B.SuppOrdid = @Ordid  and B.Styleno  = @StyleNo  group by A.SuppOrdId,B.Styleno,B.PartID ) X INNER JOIN WBS_Supp_Production ON X.OrdID = WBS_Supp_Production.Ordid And X.StyleNo = WBS_Supp_Production.StyleNo and X.PartID = WBS_Supp_Production.PartId
 WHERE WBS_Supp_Production.PartID >0 and  WBS_Supp_Production.Ordid = @Ordid And WBS_Supp_Production.Styleno = @StyleNo









Update WBS_Supp_Production SET OrderQty = x.Orderqty,OrderWithExsQty = X. CutPlanQty From  (

Select  a.SuppOrdid as Ordid,b.Styleno,0 as Partid, isNull(sum(Qty),0) as OrderQty, isNull(sum(Qty),0) as CutPlanQty from SuppOrdMas A INNER JOIN SuppOrdDet B 

ON A.SuppOrdid = B.SuppOrdid   WHERE B.SuppOrdid = @Ordid and B.Styleno  = @StyleNo group by  A.SuppOrdId,B.Styleno ) X INNER JOIN WBS_Supp_Production ON X.OrdID = WBS_Supp_Production.Ordid And X.StyleNo = WBS_Supp_Production.StyleNo and X.PartID = WBS_Supp_Production.PartId WHERE isNull(WBS_Supp_Production.PartID,0) =0 and  WBS_Supp_Production.Ordid = @Ordid And WBS_Supp_Production.Styleno = @StyleNo 











Update ST_Supp_Production_Data SET OrderQty = x.Orderqty,OrderWithExsQty = X. CutPlanQty  From  (



Select a.SuppOrdid as Ordid,B.Styleno, B.Partid,ClrID as Colid,Sizeid, IsNull(sum(Qty),0) as OrderQty, IsNull(sum(Qty),0) as CutPlanQty from SuppOrdMas A INNER JOIN SuppOrdDet B 

ON A.SuppOrdid = B.SuppOrdid INNER JOIN (Select Distinct Ordid,Styleno,PartId from OrderQtyDtl ) C ON C.ORdid = A.OrdId  and C.StyleNo = B.StyleNo WHERE B.SuppOrdid = @Ordid  and B.Styleno  = @StyleNo  group by  A.SuppOrdId,B.Styleno,B.PartID,ClrId,SizeId )
 X INNER JOIN ST_Supp_Production_Data ON X.OrdID = ST_Supp_Production_Data.Ordid And X.StyleNo = ST_Supp_Production_Data.StyleNo and X.PartID = ST_Supp_Production_Data.PartId and ST_Supp_Production_Data.ColID = x.ColID And ST_Supp_Production_Data.SizeID =
 X.SizeId WHERE ST_Supp_Production_Data.PartID >0 and  ST_Supp_Production_Data.Ordid = @Ordid  and ST_Supp_Production_Data.Styleno  = @StyleNo









Update ST_Supp_Production_Data SET OrderQty = x.Orderqty,OrderWithExsQty = X. CutPlanQty From  (



Select  a.SuppOrdid as Ordid,B.Styleno, ClrID as Colid,SizeId,0 as Partid, isNull(sum(Qty),0) as OrderQty, isNull(sum(Qty),0) as CutPlanQty from SuppOrdMas A INNER JOIN SuppOrdDet B 

ON A.SuppOrdid = B.SuppOrdid INNER JOIN (Select Distinct Ordid,Styleno from OrderQtyDtl ) C ON C.ORdid = A.OrdId  and C.StyleNo = B.StyleNo WHERE B.SuppOrdid = @Ordid  and B.Styleno  = @StyleNo  group by A.SuppOrdId,B.Styleno,ClrId,SizeId ) X INNER JOIN ST_Supp_Production_Data ON X.OrdID = ST_Supp_Production_Data.Ordid And X.StyleNo = ST_Supp_Production_Data.StyleNo and X.PartID = ST_Supp_Production_Data.PartId 

and ST_Supp_Production_Data.ColID = x.ColID And ST_Supp_Production_Data.SizeID = X.SizeId 

WHERE isNull(ST_Supp_Production_Data.PartID,0) =0 and  ST_Supp_Production_Data.Ordid = @Ordid And ST_Supp_Production_Data.StyleNo = @StyleNo







Update ST_Supp_Production_Data SET  Finish_Percent = Case when Isnull(OrderQty,0.0) >0 then (convert(Numeric(18,2),isnull(ProdQty,0)) + convert(Numeric(18,2),isnull(GrnQty,0))) /  convert(Numeric(18,2),isNull(Orderqty,0)) *100  Else 0 End 











Update ST_Supp_Production_Data SET  Finish_Percent_4Exs = Case when Isnull(OrderWithExsQty,0.0) >0 then (convert(Numeric(18,2),isnull(ProdQty,0)) + convert(Numeric(18,2),isnull(GrnQty,0))) /  convert(Numeric(18,2),isNull(OrderWithExsQty,0)) *100  Else 0 End 
