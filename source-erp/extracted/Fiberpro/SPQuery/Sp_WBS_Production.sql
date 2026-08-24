 /*                  
 
;=============================================                  



; Author  :  Global Software's                  



; Create date  :  01/Nov/2019                  



; Create By  :  ASLAM                  



; Description  :  Stored Procedure for Posting the Production Details for commando cloud



; Change Person  :  ASLAM                



; Last Change Date :  23/Oct/2024 11.30 AM                  



; =============================================   */ 



CREATE Procedure Sp_WBS_Production (@OrdId Int,@StyleNo Varchar(20),@SeqNo Int,@StageID int,@DeptId Int,@Dept Varchar(25),@DcQty Numeric (18,2),@ProdQty Numeric (18,2),@PlanStart DateTime,@PlanFinish DateTime,@ActualStart DateTime,@ActualFinish DateTime,@BGColor Varchar(50),@NewFlg Char(1),@EntryFlg Char(2),@PartId Int) As 



declare @finishpercent numeric(18,2),@exsfinishpercent numeric(18,2),@EntryOption int





If @NewFlg='Y' 

Begin 



Insert Into WBS_Production (OrdId,StyleNo,SeqNo,StageId,DeptId,Dept,DcQty,ProdQty,PartId) Values (@OrdId,@StyleNo,@SeqNo,@StageID,@DeptId,@Dept,@DcQty,@ProdQty,@PartId) 



End 



Else 



If @EntryFlg='PD' 



Begin 

Update WBS_Production Set DcQty=@DcQty Where OrdId=@OrdId And StyleNo=@StyleNo And DeptId=@DeptId And PartId=@PartId and StageID = @StageID 

End 

Else 

If @EntryFlg='PR' 

Begin 

Update WBS_Production Set ProdQty=@ProdQty Where OrdId=@OrdId And StyleNo=@StyleNo And DeptId=@DeptId And PartId=@PartId And StageID = @StageID 

End 

Else 

If @EntryFlg='SC' Begin 

Update WBS_Production Set PlanStart=@PlanStart,PlanFinish=@PlanFinish Where OrdId=@OrdId And StyleNo=@StyleNo And DeptId=@DeptId and StageID = @StageID 

End 

Update WBS_Production Set BGColor = Case When PlanStart Is Not Null And PlanFinish Is Not Null Then Case When ActualFinish Is Not Null Then Case when DateDiff(dd,PlanFinish,ActualFinish) <= 0 Then 'Green' Else 'LightGreen' End When ActualStart Is Not Null
 And ActualFinish Is Null Then Case When DateDiff(dd,Planstart,ActualStart) <= 0 Then 'Blue' When PlanFinish >= GetDate() Then 'LightBlue' When PlanFinish < GetDate() Then 'Red' End When ActualStart Is Null Then Case When PlanFinish >= GetDate() Then 'Silver' When PlanFinish < GetDate() Then 'Orange' End End End From WBS_Production Where OrdId=@OrdId And StyleNo=@StyleNo And DeptId=@DeptId and stageID = @StageID





Update WBS_Production SET OrderQty = x.Orderqty,OrderWithExsQty = X. CutPlanQty From  (

Select Ordid,Styleno,Partid, IsNull(sum(Orderqty),0) as OrderQty, IsNull(sum(CutplanQty),0) as CutPlanQty from OrderQtyDtl WHERE  Ordid = @Ordid and Styleno  = @StyleNo   group by Ordid,Styleno,PartId ) X INNER JOIN Wbs_Production ON X.OrdID = WBS_Production.Ordid And X.StyleNo = WBS_Production.StyleNo and X.PartID = WBS_Production.PartId WHERE WBS_Production.PartID >0 and  WBS_Production.Ordid = @Ordid And WBS_Production.Styleno = @StyleNo 



Update WBS_Production SET OrderQty = x.Orderqty,OrderWithExsQty = X. CutPlanQty From  (

Select Ordid,Styleno,0 as Partid, isNull(sum(SizeQty),0) as OrderQty, isNull(sum(SizeQty + ceiling((SizeQty * Exs_Per)/100)),0) as CutPlanQty from OrdQtyClrDtl  WHERE Ordid = @Ordid and Styleno  = @StyleNo group by ordid,Styleno ) X INNER JOIN Wbs_Production ON X.OrdID = WBS_Production.Ordid And X.StyleNo = WBS_Production.StyleNo and X.PartID = WBS_Production.PartId WHERE isNull(WBS_Production.PartID,0) =0 and  WBS_Production.Ordid = @Ordid And WBS_Production.Styleno = @StyleNo 






 
Update ST_Production_Data SET OrderQty = x.Orderqty,OrderWithExsQty = X. CutPlanQty  From  (

Select Ordid,Styleno,Partid,Colid,Sizeid, IsNull(sum(Orderqty),0) as OrderQty, IsNull(sum(CutplanQty),0) as CutPlanQty from OrderQtyDtl WHERE  Ordid = @Ordid and Styleno  = @StyleNo group by Ordid,Styleno,PartId,colid,SizeId ) X INNER JOIN ST_Production_Data ON X.OrdID = ST_Production_Data.Ordid And X.StyleNo = ST_Production_Data.StyleNo and X.PartID = ST_Production_Data.PartId and ST_Production_Data.ColID = x.ColID And ST_Production_Data.SizeID = X.SizeId WHERE ST_Production_Data.PartID >0 and  ST_Production_Data.Ordid = @Ordid  and ST_Production_Data.Styleno  = @StyleNo And IsNull(PartyID,0) >0 and (IsNull(ProdQty,0) >0 OR IsNull(DCQty,0) >0 OR IsNull(GRNQty,0) >0 OR isnull(RejQty,0) > 0 )
 

Update ST_Production_Data SET OrderQty = x.Orderqty,OrderWithExsQty = X. CutPlanQty  From  (

Select Ordid,Styleno,Partid,Colid,Sizeid, IsNull(sum(Orderqty),0) as OrderQty, IsNull(sum(CutplanQty),0) as CutPlanQty from OrderQtyDtl WHERE  Ordid = @Ordid and Styleno  = @StyleNo group by Ordid,Styleno,PartId,colid,SizeId ) X INNER JOIN ST_Production_Data ON X.OrdID = ST_Production_Data.Ordid And X.StyleNo = ST_Production_Data.StyleNo and X.PartID = ST_Production_Data.PartId and ST_Production_Data.ColID = x.ColID And ST_Production_Data.SizeID = X.SizeId WHERE ST_Production_Data.PartID >0 and  ST_Production_Data.Ordid = @Ordid  and ST_Production_Data.Styleno  = @StyleNo And IsNull(PartyID,0) =0



Update ST_Production_Data SET OverAllOrdQty = x.Orderqty,OrderWithExsQty = X. CutPlanQty  From  (

Select B.Ordid,B.Styleno,IsNull(sum(Orderqty),0) as OrderQty, IsNull(sum(CutplanQty),0) as CutPlanQty from OrderStyleDtl A INNER JOIN OrderQtyDtl B ON A.Ordid = B.Ordid And A.Styleno = B.Styleno WHERE  B.Ordid = @Ordid and B.Styleno  = @StyleNo and EntryOption =2 group by B.Ordid,B.Styleno) X INNER JOIN ST_Production_Data ON X.OrdID = ST_Production_Data.Ordid And X.StyleNo = ST_Production_Data.StyleNo WHERE ST_Production_Data.PartID >0 and  ST_Production_Data.Ordid = @Ordid  and ST_Production_Data.Styleno
  = @StyleNo





Update ST_Production_Data SET OrderQty = x.Orderqty,OrderWithExsQty = X. CutPlanQty From  (

Select Ordid,Styleno,CmbClrId as ColID,SizeId,0 as Partid, isNull(sum(SizeQty),0) as OrderQty, isNull(sum(SizeQty + ceiling((SizeQty * Exs_Per)/100)),0) as CutPlanQty from OrdQtyClrDtl  WHERE Ordid = @Ordid And StyleNo = @StyleNo   group by ordid,Styleno,
CmbClrId,SizeId ) X INNER JOIN ST_Production_Data ON X.OrdID = ST_Production_Data.Ordid And X.StyleNo = ST_Production_Data.StyleNo and X.PartID = ST_Production_Data.PartId 

and ST_Production_Data.ColID = x.ColID And ST_Production_Data.SizeID = X.SizeId 

WHERE isNull(ST_Production_Data.PartID,0) =0 and  ST_Production_Data.Ordid = @Ordid And ST_Production_Data.StyleNo = @StyleNo





Update ST_Production_Data SET OverAllOrdQty = x.Orderqty  From  (

Select B.Ordid,B.Styleno,IsNull(sum(Orderqty),0) as OrderQty, IsNull(sum(CutplanQty),0) as CutPlanQty from OrderStyleDtl A INNER JOIN OrderQtyDtl B ON A.Ordid = B.Ordid And A.Styleno = B.Styleno WHERE  B.Ordid = @Ordid and B.Styleno  = @StyleNo  group by 
B.Ordid,B.Styleno) X INNER JOIN ST_Production_Data ON X.OrdID = ST_Production_Data.Ordid And X.StyleNo = ST_Production_Data.StyleNo WHERE ST_Production_Data.PartID >0 and  ST_Production_Data.Ordid = @Ordid and ST_Production_Data.Styleno  = @StyleNo











 

SELECT @finishpercent  = Case when Isnull(sum(OrderQty),0.0) >0 then (convert(Numeric(18,2),isnull(sum(ProdQty),0)) + convert(Numeric(18,2),isnull(sum(GrnQty),0))) /  convert(Numeric(18,2),isNull(sum(Orderqty),0)) *100  Else 0 End from ST_Production_Data 
A INNER JOIN OrderStyleDtl B ON A.Ordid = B.Ordid And A.Styleno = B.STyleno WHERE A.Ordid = @Ordid And A.StyleNo = @Styleno and StageId =@StageID and partid = @partid And EntryOption= 2 



Update ST_Production_Data SET  Finish_Percent = @finishpercent WHERE ST_Production_Data.Ordid = @Ordid And ST_Production_Data.StyleNo = @StyleNo and Stageid =@StageId and partID = @Partid



 



 

SELECT @exsfinishpercent = Case when Isnull(sum(OrderWithExsQty),0.0) >0 then (convert(Numeric(18,2),isnull(sum(ProdQty),0)) + convert(Numeric(18,2),isnull(sum(GrnQty),0))) /  convert(Numeric(18,2),isNull(sum(OrderWithExsQty),0)) *100  Else 0 End FROM ST_Production_Data WHERE ST_Production_Data.Ordid = @Ordid And ST_Production_Data.StyleNo = @StyleNo and StageID = @StageId and PartId = @PartID



Update ST_Production_Data SET  Finish_Percent_4Exs= @exsfinishpercent WHERE ST_Production_Data.Ordid = @Ordid And ST_Production_Data.StyleNo = @StyleNo and Stageid =@StageId and partID = @Partid



SELECT @finishpercent  = Case when Isnull(Avg(OverAllOrdQty),0.0) >0 then (convert(Numeric(18,2),isnull(sum(ProdQty),0)) + convert(Numeric(18,2),isnull(sum(GrnQty),0))) /  convert(Numeric(18,2),isNull(Avg(OverAllOrdQty),0)) *100  Else 0 End from ST_Production_Data WHERE ST_Production_Data.Ordid = @Ordid And ST_Production_Data.StyleNo = @Styleno and StageId =@StageID and partid = @partid





Update ST_Production_Data SET  Finish_Percent = @finishpercent WHERE ST_Production_Data.Ordid = @Ordid And ST_Production_Data.StyleNo = @StyleNo and Stageid =@StageId and partID = @Partid







/*Update ST_Production_Data SET  Finish_Percent = Case when Isnull(OrderQty,0.0) >0 then (convert(Numeric(18,2),isnull(ProdQty,0)) + convert(Numeric(18,2),isnull(GrnQty,0))) /  convert(Numeric(18,2),isNull(Orderqty,0)) *100  Else 0 End WHERE ST_Production
_Data.Ordid = @Ordid And ST_Production_Data.StyleNo = @StyleNo  





Update ST_Production_Data SET  Finish_Percent_4Exs = Case when Isnull(OrderWithExsQty,0.0) >0 then (convert(Numeric(18,2),isnull(ProdQty,0)) + convert(Numeric(18,2),isnull(GrnQty,0))) /  convert(Numeric(18,2),isNull(OrderWithExsQty,0)) *100  Else 0 End WH
ERE ST_Production_Data.Ordid = @Ordid And ST_Production_Data.StyleNo = @StyleNo */
