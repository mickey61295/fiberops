/*;=============================================   
; Author           :  Global Software's    
; Create date      :  17/08/2022    
; Create By        :  ASLAM  
; Description      :  Production Rework line Stock  
; Change Person    :  ASLAM
; Last Change Date :  29/11/2025 10.36 AM 
; =============================================  */  
CREATE PROCEDURE PROC_Stock_ProdPieces_LineOut_PrdEntry_ReWrk (@Id Int,@SizeId Int,@ProdPcs Int) As DECLARE @Coycode Int,@Ordid Int,@StyleNo Varchar(20),@StageId Int,@PartId Int,@GodId Int,@ColId Int,@StockQty Int,@SourceStageId Int,@FinalStage Char(1),@SeqNo int,@PartyId Int,@PcsStockId Int,@Rework Int,@RejectionTypeId Int ,@LotNo Varchar(15),@LotId Int  ,@EntryOption int  ,@ComboID int   ,@LineID int
Select @Coycode = CoyId From Trs_ProdEntry Where Id=@Id        
Select @PartyId = 0     
SELECT @Ordid = OrdId From Trs_ProdEntry Where Id=@Id
SELECT @StyleNo = StyleNo From Trs_ProdEntry Where Id=@Id      
SELECT @Stageid = StageId From Trs_ProdEntry Where Id=@Id     
SELECT @LineID = isnull(LineID,0) From Trs_ProdEntry Where Id=@Id     
SELECT @SourceStageId = SourceStageId From Trs_ProdEntry Where Id=@Id     
SELECT @PartId = PartId From Trs_ProdEntry Where Id=@Id     
SELECT @GodId = GodId From Trs_ProdEntry Where Id=@Id     
SELECT @Rework = Rework From Trs_ProdEntry Where Id=@Id     
SELECT @RejectionTypeId = RejectionTypeId From Trs_ProdEntry Where Id=@Id     
SELECT @LotID = Isnull(LotID,0) From Trs_ProdEntry Where Id=@Id     
SELECT @SeqNo = SeqNo From Trs_ProdEntry Inner Join  Prod_Sequence On Trs_ProdEntry.OrdId=Prod_Sequence.OrdId And Trs_ProdEntry.StyleNo=Prod_Sequence.StyleNo And Trs_ProdEntry.StageId=Prod_Sequence.StageId Where Id=@Id     
SELECT @ComboID = ClrID From Trs_ProdEntry Where Id=@Id     
SELECT @FinalStage = Mas_Dept.SemiFinish From Trs_ProdEntry Inner Join Mas_JobWrkComp On  Trs_ProdEntry.StageId=Mas_JobWrkComp.Id Inner Join Mas_Dept On Mas_JobWrkComp.DeptId=Mas_Dept.DeptId Where Trs_ProdEntry.Id=@Id     
SELECT @ColId = ClrId From Trs_ProdEntry Where Id=@Id      
SELECT @StockQty = @ProdPcs     
Select @EntryOption = EntryOption from OrderStyleDtl Where Ordid= @Ordid And StyleNo = @StyleNo        	
BEGIN   
IF EXISTS (select * from Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and  Stageid = @Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId And ISNULL(Pcs_StockTable.EmpID,0) =0)      
BEGIN      
Select @PcsStockId=PcsStockId From Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId   And ISNULL(Pcs_StockTable.EmpID,0) = 0

If EXISTS (select * from Pcs_StockTable Inner Join Pcs_StockTableQty On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0  And ISNULL(Pcs_StockTable.EmpID,0) = @LineID)     
Begin     
Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty +@StockQty,Pcs_StockTableQty.ProductionQty=Pcs_StockTableQty.ProductionQty+
@StockQty From  Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId  where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and Stageid=@Stageid and PartId=@PartId and GodId=@GodId
 and PartyId=@PartyId and Pcs_StockTableQty.ColId=@Colid and  Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0   And ISNULL(Pcs_StockTable.EmpID,0) =@LineID
End    
Else    
  Begin    
	  INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,ProductionQty,GoodPcsFlag,RejectionTypeId)  VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,@StockQty,'G',0)   
  End   
  END     
 ELSE     
	 BEGIN   
  Select @PcsStockId=IsNull(Max(PcsStockId),0)+1 From Pcs_StockTable   


  INSERT INTO Pcs_StockTable (Coycode,Ordid,styleNo,Stageid,PartId,SeqNo,GodId,PcsStockId,PartyId,LotId,EmpID)  VALUES (@Coycode,@Ordid,@StyleNo,@Stageid,@PartId,@SeqNo,@GodId,@PcsStockId,@PartyId,@LotID,@LineID)    

  INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,ProductionQty,GoodPcsFlag,RejectionTypeId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,@StockQty,'G',0)   
  End      

  If @StageId<>1  And @FinalStage='S' And (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Piece'      
BEGIN   
Select @PcsStockId=PcsStockId From Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and  Stageid=@SourceStageId and PartId=@PartId and GodId=@GodId and PartyId=@PartyId  And ISNULL(Pcs_StockTable.EmpID,0) = 0 

 Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-@StockQty From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and Stageid=@SourceStageId and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2 Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2 Then 0 Else @RejectionTypeId End   And ISNULL(Pcs_StockTable.EmpID,0) = 0

 END   


 /* Time Being below will not work 
  If @StageId=1  And @FinalStage='S' And (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Piece'    and @Rework =1  
  BEGIN   



  Select @PcsStockId=PcsStockId From Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and  Stageid=@SourceStageId and PartId=@PartId and GodId=@GodId and PartyId=@PartyId   And ISNULL(Pcs_StockTable.EmpID,0) = @LineID



  Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-@StockQty From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and Stageid=@SourceStageId and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2 Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2 Then 0 Else @RejectionTypeId End   And ISNULL(Pcs_StockTable.EmpID,0) = @LineID



  END  



  If @StageId<>1 And @FinalStage='F' And (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Piece'   
  BEGIN  
  
  Select @PcsStockId=PcsStockId From Pcs_StockTable Where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and Stageid=@SourceStageId  and  GodId=@GodId and PartyId=@PartyId    And ISNULL(Pcs_StockTable.EmpID,0) = @LineID

 if @EntryOption =1  
   Begin     
     Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.
	 StockQty-@StockQty    From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId  INNER JOIN Trs_ProdEntry_SourceStageDtl ON  Pcs_StockTable.PartId = Trs_ProdEntry_SourceStageDtl.PartId And  Pcs_StockTable.StageId  = Trs_ProdEntry_SourceStageDtl.SourceStageId  where Trs_ProdEntry_SourceStageDtl.ID = @Id And  coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId  and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.SizeId=@SizeId And Pcs_StockTableQty.Colid = @ColId and  IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2 Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2 Then 0 Else @RejectionTypeId End  And ISNULL(Pcs_StockTable.EmpID,0) =@LineID



END  



   Else     



   BEGIN  /* Reduct the Stock(PackOrder) - Noofpcs from each colour*/    	 



      Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-(@StockQty*IsNull(OrderQtyDtl.PcsPerColor,1)) From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId  INNER JOIN OrderQtyDtl on Pcs_StockTable.Ordid = OrderQtyDtl.Ordid And Pcs_StockTable.Styleno = OrderQtyDtl.StyleNo And OrderQtyDtl.ColId = Pcs_StockTableQty.Colid  And OrderQtyDtl.SizeId =



 Pcs_StockTableQty.SizeId And OrderQtyDtl.PartId = Pcs_StockTable.PartID  LEFT OUTER JOIN Mas_Lot ON OrderQtyDtl.LotNo = Mas_Lot.LotName	 INNER JOIN Trs_ProdEntry_SourceStageDtl ON  Pcs_StockTable.PartId = Trs_ProdEntry_SourceStageDtl.PartId And Pcs_StockTable.StageId  = Trs_ProdEntry_SourceStageDtl.SourceStageId    WHERE Trs_ProdEntry_SourceStageDtl.ID = @Id And Pcs_StockTable.coycode=@coycode and Pcs_StockTable.Ordid=@Ordid and Pcs_StockTable.StyleNo=@StyleNo and LotId = @LotId  and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.SizeId=@SizeId     and OrderQtyDtl.CmbClrID=@ComboID   and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2 Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2 Then 0 Else @RejectionTypeId End  And ISNULL(Pcs_StockTable.EmpID,0) = @LineID   



 END      



 End   	*/



 End 