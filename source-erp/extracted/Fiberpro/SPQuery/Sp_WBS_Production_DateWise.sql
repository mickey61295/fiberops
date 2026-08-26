 /*                  
;=============================================                  
; Author           :  Global Software's                  
; Create date      :  21/Dec/2023                  
; Create By        :  ASLAM                  
; Description      :  Stored Procedure for Posting the Production Details for commando cloud
; Change Person    :  ASLAM                
; Last Change Date :  25/Jul/2025 09.45 AM                  
; =============================================   */ 

CREATE PROCEDURE Sp_WBS_Production_DateWise (@Coycode Int, @Dt DateTime,@OrdId Int,@StyleNo Varchar(20),@SeqNo Int,@StageID int,@DeptId Int,@Dept Varchar(25),@DcQty Numeric (18,2),@ProdQty Numeric (18,2),@NewFlg Char(1),@EntryFlg Char(2),@PartId Int,@LineID Int,@DelFlg Char(1)) As 

declare @finishpercent numeric(18,2),@exsfinishpercent numeric(18,2),@EntryOption int



Declare @SewingFlg Char(1),@DeptCode int



Declare @RecCount int,@BudgetExcess Char(1)



SELECT @BudgetExcess = isNull(Allow_Excess_InBudget,'N') From Options



SELECT @DeptCode = IsNull(Stitching_DeptCode,0) FROM Options















IF @DeptCode = @DeptId 



	SET @SewingFlg = 'Y'



ELSE	



	SET @SewingFlg = 'N'











IF @SewingFlg ='N'



BEGIN







SELECT @RecCount =  Count(1) from WBS_Production_DateWise WHERE OrdId=@OrdId And StyleNo=@StyleNo And DeptId=@DeptId And PartId=@PartId and StageID = @StageID And ProdDate=@Dt And coycode = @Coycode







If @NewFlg='Y' 



Begin 



   if @RecCount =0 



	



		Insert Into WBS_Production_DateWise (Coycode,ProdDate,OrdId,StyleNo,SeqNo,StageId,DeptId,Dept,DcQty,ProdQty,PartId) Values		



			(@Coycode,@Dt,@OrdId,@StyleNo,@SeqNo,@StageID,@DeptId,@Dept,@DcQty,@ProdQty,@PartId) 



	ELSE



			Update WBS_Production_DateWise Set ProdQty=ProdQty + @ProdQty,DcQty = DcQty + @DcQty Where OrdId=@OrdId And StyleNo=@StyleNo And DeptId=@DeptId And PartId=@PartId And StageID = @StageID And ProdDate = @Dt And coycode = @Coycode







End 







Else 







If @EntryFlg='PD' And @DelFlg ='N'



Begin 



Update WBS_Production_DateWise Set DcQty=DCQty + @DcQty Where OrdId=@OrdId And StyleNo=@StyleNo And DeptId=@DeptId And PartId=@PartId and StageID = @StageID And ProdDate=@Dt And coycode = @Coycode







End 







Else 







If @EntryFlg='PR' And @DelFlg ='N'



Begin 







Update WBS_Production_DateWise Set ProdQty=ProdQty + @ProdQty Where OrdId=@OrdId And StyleNo=@StyleNo And DeptId=@DeptId And PartId=@PartId And StageID = @StageID And ProdDate = @Dt And coycode = @Coycode







End 







If @EntryFlg='PD' And @DelFlg ='Y'



Begin 



Update WBS_Production_DateWise Set DcQty=DcQty -@DcQty Where OrdId=@OrdId And StyleNo=@StyleNo And DeptId=@DeptId And PartId=@PartId and StageID = @StageID And ProdDate=@Dt And coycode = @Coycode







End 







Else 







If @EntryFlg='PR' And @DelFlg ='Y'



Begin 







Update WBS_Production_DateWise Set ProdQty=ProdQty - @ProdQty Where OrdId=@OrdId And StyleNo=@StyleNo And DeptId=@DeptId And PartId=@PartId And StageID = @StageID And ProdDate = @Dt And coycode = @Coycode







End 



 











Update WBS_Production_DateWise SET OrderQty = x.Orderqty,OrderWithExsQty = X. CutPlanQty From  (







Select Ordid,Styleno,Partid, IsNull(sum(Orderqty),0) as OrderQty, IsNull(sum(CutplanQty),0) as CutPlanQty from OrderQtyDtl WHERE  Ordid = @Ordid and Styleno  = @StyleNo   group by Ordid,Styleno,PartId ) X INNER JOIN WBS_Production_DateWise ON X.OrdID = WBS_Production_DateWise.Ordid And X.StyleNo = WBS_Production_DateWise.StyleNo and X.PartID = WBS_Production_DateWise.PartId WHERE WBS_Production_DateWise.PartID >0 and  WBS_Production_DateWise.Ordid = @Ordid And WBS_Production_DateWise.Styleno = @StyleNo  AND ProdDate = @Dt And coycode = @Coycode















Update WBS_Production_DateWise SET OrderQty = x.Orderqty,OrderWithExsQty = X. CutPlanQty From  (







Select Ordid,Styleno,0 as Partid, isNull(sum(SizeQty),0) as OrderQty, isNull(sum(SizeQty + ceiling((SizeQty * Exs_Per)/100)),0) as CutPlanQty from OrdQtyClrDtl  WHERE Ordid = @Ordid and Styleno  = @StyleNo group by ordid,Styleno ) X INNER JOIN WBS_Production_DateWise ON X.OrdID = WBS_Production_DateWise.Ordid And X.StyleNo = WBS_Production_DateWise.StyleNo and X.PartID = WBS_Production_DateWise.PartId WHERE isNull(WBS_Production_DateWise.PartID,0) =0 and  WBS_Production_DateWise.Ordid = @Ordid And WBS_Production_DateWise.Styleno = @StyleNo  AND ProdDate = @Dt  And coycode = @Coycode







END



ELSE



/* LINE WISE FOR SEWING */



BEGIN



SELECT @RecCount =  Count(1) from WBS_Production_DateWise WHERE OrdId=@OrdId And StyleNo=@StyleNo And DeptId=@DeptId And PartId=@PartId and StageID = @StageID And ProdDate=@Dt And coycode = @Coycode And LineID = @LineId







If @NewFlg='Y' 



Begin 



 



 IF @RecCount =0   



		Insert Into WBS_Production_DateWise (Coycode,ProdDate,OrdId,StyleNo,SeqNo,StageId,DeptId,Dept,DcQty,ProdQty,PartId,LineID) Values 



		(@Coycode,@Dt,@OrdId,@StyleNo,@SeqNo,@StageID,@DeptId,@Dept,@DcQty,@ProdQty,@PartId,@LineID) 



 ELSE



		 Update WBS_Production_DateWise Set ProdQty=ProdQty + @ProdQty, DcQty = DcQty + @DcQty Where OrdId=@OrdId And StyleNo=@StyleNo And DeptId=@DeptId And PartId=@PartId And StageID = @StageID And ProdDate = @Dt And LineID = @LineID And coycode = @Coycode 



		



End 



Else 



If @EntryFlg='PD' And @DelFlg ='N'



Begin 



Update WBS_Production_DateWise Set DcQty=DCQty + @DcQty Where OrdId=@OrdId And StyleNo=@StyleNo And DeptId=@DeptId And PartId=@PartId and StageID = @StageID And ProdDate=@Dt And LineID = @LineID And coycode = @Coycode







End 







Else 







If @EntryFlg='PR' And @DelFlg ='N'



Begin 







Update WBS_Production_DateWise Set ProdQty=ProdQty + @ProdQty Where OrdId=@OrdId And StyleNo=@StyleNo And DeptId=@DeptId And PartId=@PartId And StageID = @StageID And ProdDate = @Dt And LineID = @LineID And coycode = @Coycode







End 







If @EntryFlg='PD' And @DelFlg ='Y'



Begin 



Update WBS_Production_DateWise Set DcQty=DCQty - @DcQty Where OrdId=@OrdId And StyleNo=@StyleNo And DeptId=@DeptId And PartId=@PartId and StageID = @StageID And ProdDate=@Dt And LineID = @LineID And coycode = @Coycode







End 







Else 







If @EntryFlg='PR' And @DelFlg ='Y'



Begin 







Update WBS_Production_DateWise Set ProdQty=ProdQty - @ProdQty Where OrdId=@OrdId And StyleNo=@StyleNo And DeptId=@DeptId And PartId=@PartId And StageID = @StageID And ProdDate = @Dt And LineID = @LineID And coycode = @Coycode







End 















Update WBS_Production_DateWise SET OrderQty = x.Orderqty,OrderWithExsQty = X. CutPlanQty From  (







Select Ordid,Styleno,Partid, IsNull(sum(Orderqty),0) as OrderQty, IsNull(sum(CutplanQty),0) as CutPlanQty from OrderQtyDtl WHERE  Ordid = @Ordid and Styleno  = @StyleNo   group by Ordid,Styleno,PartId ) X INNER JOIN WBS_Production_DateWise ON X.OrdID = WBS_Production_DateWise.Ordid And X.StyleNo = WBS_Production_DateWise.StyleNo and X.PartID = WBS_Production_DateWise.PartId WHERE WBS_Production_DateWise.PartID >0 and  WBS_Production_DateWise.Ordid = @Ordid And WBS_Production_DateWise.Styleno = @StyleNo  AND ProdDate = @Dt And LineID = @LineID And coycode = @Coycode















Update WBS_Production_DateWise SET OrderQty = x.Orderqty,OrderWithExsQty = X. CutPlanQty From  (







Select Ordid,Styleno,0 as Partid, isNull(sum(SizeQty),0) as OrderQty, isNull(sum(SizeQty + ceiling((SizeQty * Exs_Per)/100)),0) as CutPlanQty from OrdQtyClrDtl  WHERE Ordid = @Ordid and Styleno  = @StyleNo group by ordid,Styleno ) X INNER JOIN WBS_Production_DateWise ON X.OrdID = WBS_Production_DateWise.Ordid And X.StyleNo = WBS_Production_DateWise.StyleNo and X.PartID = WBS_Production_DateWise.PartId WHERE isNull(WBS_Production_DateWise.PartID,0) =0 and  WBS_Production_DateWise.Ordid = @Ordid And WBS_Production_DateWise.Styleno = @StyleNo  AND ProdDate = @Dt And LineID = @LineID And coycode = @Coycode



END











Update WBS_Production_DateWise SET BudgetCost = ProdQty * IsNull(B.Rate,0) , BudgetRate = IsNull(B.Rate,0) ,BudgetAmt=



CASE WHEN Rtrim(@BudgetExcess) ='Y' THEN A.OrderWithExsQty * IsNull(B.Rate,0)  ELSE A.OrderQty * IsNull(B.Rate,0) END

 FROM WBS_Production_DateWise A INNER JOIN Pro_Prod_PartwiseRate B ON A.OrdId = B.OrdID 



AND A.StyleNo = B.Styleno And A.PartId = B.PartID And A.Stageid = B.WrkID WHERE   A.OrdId = @OrdId And A.StyleNo = @StyleNo And A.PartId = @PartId



And A.Stageid = @StageID 



Update WBS_Production_DateWise SET BudgetRate = IsNull(B.Rate,0) ,BudgetAmt=



CASE WHEN Rtrim(@BudgetExcess) ='Y' THEN A.OrderWithExsQty * IsNull(B.Rate,0)  ELSE A.OrderQty * IsNull(B.Rate,0) END

 FROM WBS_Production_DateWise A INNER JOIN Pro_Prod_PartwiseRate B ON A.OrdId = B.OrdID 



AND A.StyleNo = B.Styleno And A.PartId = B.PartID And A.Stageid = B.WrkID  