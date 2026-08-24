/*;=============================================   
; Author           :  Global Software's    
; Create date      :  17/08/2022    
; Create By        :  ASLAM  
; Description      :  Production Stock   (FOR ISSUE TO PRODUCTION ENABLED)
; Change Person    :  ASLAM
; Last Change Date :  13/12/2024 10.35 AM 
; =============================================  */  

CREATE PROCEDURE PROC_Stock_ProdPieces_IssueToPrdn (@Id Int,@SizeId Int,@ProdPcs Int) As DECLARE @Coycode Int,@Ordid Int,@StyleNo Varchar(20),@StageId Int,@PartId Int,@GodId Int,@ColId Int,@StockQty Int,@SourceStageId Int,@FinalStage Char(1),@SeqNo int,@PartyId Int,@PcsStockId Int,@Rework Int,@RejectionTypeId Int ,@LotNo Varchar(15),@LotId Int  ,@EntryOption int  ,@ComboID int   ,@EmpID int,@PcsStk_From_IssueToProd char(1),@EmpId1 int

Select @Coycode = CoyId From Trs_ProdEntry Where Id=@Id        

Select @PartyId = 0     


Select @PcsStk_From_IssueToProd = isNull(PcsStk_From_IssueToProd,'N') from Options1

IF @PcsStk_From_IssueToProd='Y'
BEGIN
SELECT @EmpID = Isnull(EmpID,0) From Trs_ProdEntry Where Id=@Id     /* only for Stock Reduce from IssueToProdn -> employee */
Select @EmpId1  = 0     
END
ELSE
BEGIN
	Select @EmpID = 0
	Select @EmpId1  = 0     
END

SELECT @Ordid = OrdId From Trs_ProdEntry Where Id=@Id

   SELECT @StyleNo = StyleNo From Trs_ProdEntry Where Id=@Id      

   SELECT @Stageid = StageId From Trs_ProdEntry Where Id=@Id     

   SELECT @SourceStageId = SourceStageId From Trs_ProdEntry Where Id=@Id     

   SELECT @PartId = PartId From Trs_ProdEntry Where Id=@Id     

   SELECT @GodId = GodId From Trs_ProdEntry Where Id=@Id     

   SELECT @Rework = Rework From Trs_ProdEntry Where Id=@Id     

   SELECT @RejectionTypeId = RejectionTypeId From Trs_ProdEntry Where Id=@Id     

   SELECT @LotID = Isnull(LotID,0) From Trs_ProdEntry Where Id=@Id     

   Select @SeqNo = SeqNo From Trs_ProdEntry Inner Join  Prod_Sequence On Trs_ProdEntry.OrdId=Prod_Sequence.OrdId And Trs_ProdEntry.StyleNo=Prod_Sequence.StyleNo And Trs_ProdEntry.StageId=Prod_Sequence.StageId Where Id=@Id     

   SELECT @ComboID = ClrID From Trs_ProdEntry Where Id=@Id     

   SELECT @FinalStage = Mas_Dept.SemiFinish From Trs_ProdEntry Inner Join Mas_JobWrkComp On  Trs_ProdEntry.StageId=Mas_JobWrkComp.Id Inner Join Mas_Dept On Mas_JobWrkComp.DeptId=Mas_Dept.DeptId Where Trs_ProdEntry.Id=@Id     



SELECT @ColId = ClrId From Trs_ProdEntry Where Id=@Id      

SELECT @StockQty = @ProdPcs     

Select @EntryOption = EntryOption from OrderStyleDtl Where Ordid= @Ordid And StyleNo = @StyleNo        	

BEGIN   

IF EXISTS (select * from Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and  Stageid = @Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and isnull(EmpID,0) = @EmpID1 )      

BEGIN    

Select @PcsStockId=PcsStockId From Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId  And IsNull(EmpId,0) = @EmpID1 

If EXISTS (select * from Pcs_StockTable Inner Join Pcs_StockTableQty On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId And IsNull(EmpId,0) = @EmpId1 and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0)     

Begin     
print '6777'
Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty +@StockQty,Pcs_StockTableQty.ProductionQty=Pcs_StockTableQty.ProductionQty+@StockQty From  Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId  where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and Stageid=@Stageid and PartId=@PartId and GodId=@GodId
 and PartyId=@PartyId and Pcs_StockTableQty.ColId=@Colid and  Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0  And IsNull(EmpId,0) = @EmpId1 /* EmpID */

 

  End    

  Else    

  

  Begin    

  

  INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,ProductionQty,GoodPcsFlag,RejectionTypeId)  VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,@StockQty,'G',0)   
  End   
  END     
  ELSE     
  
  BEGIN   
  Select @PcsStockId=IsNull(Max(PcsStockId),0)+1 From Pcs_StockTable   
  
  INSERT INTO Pcs_StockTable (Coycode,Ordid,styleNo,Stageid,PartId,SeqNo,GodId,PcsStockId,PartyId,LotId,EmpId)  VALUES (@Coycode,@Ordid,@StyleNo,@Stageid,@PartId,@SeqNo,@GodId,@PcsStockId,@PartyId,@LotID,@EmpID1)  

  INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,ProductionQty,GoodPcsFlag,RejectionTypeId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,@StockQty,'G',0)   
  End      
  If @StageId<>1  And @FinalStage='S' And (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Piece'      
  BEGIN   
  Select @PcsStockId=PcsStockId From Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and  Stageid=@SourceStageId and PartId=@PartId and GodId=@GodId and PartyId=@PartyId  And IsNull(EmpId,0) = @EmpId
print 'xxxx'
Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-@StockQty From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = 
@LotId and Stageid=@SourceStageId and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId 
And IsNull(EmpId,0) = @EmpId
and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2 Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2 Then 0 Else @RejectionTypeId End  

  END   

  If @StageId=1  And @FinalStage='S' And (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Piece'    and @Rework =1  
  BEGIN  

  Select @PcsStockId=PcsStockId From Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and  Stageid=@SourceStageId and PartId=@PartId and GodId=@GodId and PartyId=@PartyId  And IsNull(EmpId,0) = @EmpId
print 'dddd'
  Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-@StockQty From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and Stageid=@SourceStageId and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId And IsNull(EmpId,0) = @EmpId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2 Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2 Then 0 Else @RejectionTypeId End  

  END  

  If @StageId<>1 And @FinalStage='F' And (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Piece'   

  BEGIN  

  Select @PcsStockId=PcsStockId From Pcs_StockTable Where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and Stageid=@SourceStageId  and  GodId=@GodId and PartyId=@PartyId And IsNull(EmpId,0) = @EmpId   

  if @EntryOption =1  

  Begin     

  Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-@StockQty    From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId  INNER JOIN Trs_ProdEntry_SourceStageDtl ON  Pcs_StockTable.StageId  = Trs_ProdEntry_SourceStageDtl.SourceStageId  where Trs_ProdEntry_SourceStageDtl.ID = @Id And  coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId  and GodId=@GodId and PartyId=@PartyId And IsNull(EmpId,0) = @EmpId and Pcs_StockTableQty.SizeId=@SizeId And Pcs_StockTableQty.Colid = @ColId and Pcs_StockTable.PartID =0 and  IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2 Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2 Then 0 Else @RejectionTypeId End      

END  

   Else     

   BEGIN  /* Reduct the Stock(PackOrder) - Noofpcs from each colour*/    	 
print '44444'
   /*   Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-(@StockQty*IsNull(OrderQtyDtl.PcsPerColor,1)) From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId  INNER JOIN OrderQtyDtl on Pcs_StockTable.Ordid = OrderQtyDtl.Ordid And Pcs_StockTable.Styleno = OrderQtyDtl.StyleNo And OrderQtyDtl.ColId = Pcs_StockTableQty.Colid  And OrderQtyDtl.SizeId =

 Pcs_StockTableQty.SizeId  LEFT OUTER JOIN Mas_Lot ON OrderQtyDtl.LotNo = Mas_Lot.LotName	 INNER JOIN Trs_ProdEntry_SourceStageDtl ON  Pcs_StockTable.StageId  = Trs_ProdEntry_SourceStageDtl.SourceStageId    WHERE Trs_ProdEntry_SourceStageDtl.ID = @Id And Pcs_StockTable.coycode=@coycode and Pcs_StockTable.Ordid=@Ordid and Pcs_StockTable.StyleNo=@StyleNo and LotId = @LotId  and GodId=@GodId and PartyId=@PartyId And IsNull(EmpId,0) = @EmpId and Pcs_StockTableQty.SizeId=@SizeId And Pcs_StockTable.PartId =0     and OrderQtyDtl.CmbClrID=@ComboID   and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2 Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2 Then 0 Else @RejectionTypeId End     */ 

/* Test */
      Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-@StockQty/*(@StockQty*IsNull(OrderQtyDtl.PcsPerColor,1))*/ From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId  INNER JOIN OrderQtyDtl on Pcs_StockTable.Ordid = OrderQtyDtl.Ordid And Pcs_StockTable.Styleno = OrderQtyDtl.StyleNo And OrderQtyDtl.CmbClrID = Pcs_StockTableQty.Colid  And OrderQtyDtl.SizeId = Pcs_StockTableQty.SizeId  LEFT OUTER JOIN Mas_Lot ON OrderQtyDtl.LotNo = Mas_Lot.LotName	 INNER JOIN Trs_ProdEntry_SourceStageDtl ON  Pcs_StockTable.StageId  = Trs_ProdEntry_SourceStageDtl.SourceStageId    WHERE Trs_ProdEntry_SourceStageDtl.ID = @Id And Pcs_StockTable.coycode=@coycode and Pcs_StockTable.Ordid=@Ordid and Pcs_StockTable.StyleNo=@StyleNo and LotId = @LotId  and GodId=@GodId and PartyId=@PartyId And IsNull(EmpId,0) = @EmpId and Pcs_StockTableQty.SizeId=@SizeId And Pcs_StockTable.PartId =0   
  and OrderQtyDtl.CmbClrID=@ComboID   and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2 Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2 Then 0 Else @RejectionTypeId End    

 END      

 End   	

 End 