/*;=============================================   
; Author           :  Global Software's    
; Create date      :  18/02/2026    
; Create By        :  ASLAM  
; Description      :  Reowrk And Place Stock  in Line
; Change Person    :  ASLAM
; Last Change Date :  18/02/2026 10.45 AM 
; =============================================  */  
CREATE PROCEDURE PROC_Stock_ProdPieces_Update_LineOut_Rewrk (@Id Int,@SizeId Int,@ProdPcs Int)  AS  DECLARE @Coycode Int,@Ordid Int,@StyleNo Varchar(20),@StageId Int,@PartId Int,@GodId Int,@ColId Int,  @StockQty Int,@SourceStageId Int,@FinalStage Char(1),@SeqNo
 int,@PartyId Int,@PcsStockId Int ,@OldId Int,@OldCoycode Int,@OldOrdid Int,@OldStyleNo Varchar(20),@OldStageId Int,@OldPartId Int,@OldGodId Int,@OldColId Int,    @OldSizeId Int,@OldStockQty Int,@OldSourceStageId Int,@OldFinalStage Char(1),@OldSeqNo int,@OldPartyId Int      ,@OldPcsStockId Int,@Rework Int,@RejectionTypeId Int ,@LotNo Varchar(15),@LotID int,@Src_LineID int        
 
SELECT @OldId=@Id       
SELECT @OldCoycode = CoyId From Trs_ProdEntry Where Id=@OldId       
SELECT @OldPartyId = 0       
SELECT @OldOrdid = OrdId From Trs_ProdEntry  Where Id=@OldId   
SELECT @OldStyleNo = StyleNo From Trs_ProdEntry Where Id=@OldId     
SELECT @OldStageid = StageId From Trs_ProdEntry Where Id=@OldId    
SELECT @OldPartId = PartId From Trs_ProdEntry Where Id=@OldId    
SELECT @OldGodId = GodId From Trs_ProdEntry Where Id=@OldId    
SELECT @Rework = Rework From Trs_ProdEntry Where Id=@OldId     
SELECT @Src_LineID = IsNull(LineID,0) From Trs_ProdEntry Where Id=@OldId     
SELECT @RejectionTypeId = RejectionTypeId From Trs_ProdEntry Where Id=@OldId    
SELECT @OldSeqNo = SeqNo From Trs_ProdEntry Inner Join Prod_Sequence On 
Trs_ProdEntry.OrdId=Prod_Sequence.OrdId And Trs_ProdEntry.StyleNo=Prod_Sequence.StyleNo And Trs_ProdEntry.StageId=Prod_Sequence.StageId    Where Id=@OldId    
SELECT @OldFinalStage = Mas_Dept.SemiFinish From Trs_ProdEntry Inner Join Mas_JobWrkComp On Trs_ProdEntry.StageId=Mas_JobWrkComp.Id Inner Join Mas_Dept On Mas_JobWrkComp.DeptId=Mas_Dept.DeptId Where Trs_ProdEntry.Id=@OldId    
SELECT @OldColId = ClrId From Trs_ProdEntry Where Id=@OldId   
SELECT @OldSizeId = @SizeId   
SELECT @OldSourceStageId = SourceStageId From Trs_ProdEntry Where Id=@OldId   
SELECT @OldStockQty = ProdPcs From Trs_ProdEntryQty Where Id=@OldId  and Sizid = @SizeId    
SELECT @LotId = IsNull(LotId,0) From Trs_ProdEntry Where Id=@OldId    
print 'aaa-Rewotk'
print @OldSourceStageId
print @Src_LineID
if @OldStageId =-2  
	begiN   
		SELECt @OldSourceStageId = -2  
	end  
begin  
	if @OldFinalStage='F'    
	begin 
	print 'aaa-Rewotk-1'  
	If EXISTS (select * from Pcs_StockTable Inner Join Pcs_StockTableQty On    Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId INNER JOIN Trs_ProdEntry_SourceStageDtl ON  Pcs_StockTable.PartId = Trs_ProdEntry_SourceStageDtl.PartId And Pcs_StockTable.StageId  = Trs_ProdEntry_SourceStageDtl.SourceStageId where coycode=@Oldcoycode   and Ordid=@OldOrdid and StyleNo=@OldStyleNo and LotId = @LotId and GodId=@OldGodId and PartyId=@OldPartyId And ISNULL(Pcs_StockTable.EmpID,0) = 0)   

	begin   
		Select @OldPcsStockId=PcsStockId From Pcs_StockTable where coycode=@Oldcoycode and  Ordid=@OldOrdid and StyleNo=@OldStyleNo and LotId = @LotId   and Stageid=@OldStageid and GodId=@OldGodId and PartyId=@OldPartyId And ISNULL(Pcs_StockTable.EmpID,0) = 0 

/* Print 'as2' Print 'as' + str(@OldOrdid) 
Print 'as' + (@OldStyleno) Print 'as' + str(@oldSizeId)  Print 'as' + str(@Id) Print 'as' + str(@OldSourceStageId)  Print 'as' + str(@OldStageid) Print 'as' + str(@Lotid)     Print 'as' + str(@OldColid)  Print 'as' + str(@OldPartyid) */   



If EXISTS (select * from Pcs_StockTable Inner Join Pcs_StockTableQty On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId INNER JOIN Trs_ProdEntry_SourceStageDtl ON    Pcs_StockTable.PartId = Trs_ProdEntry_SourceStageDtl.PartId And Pcs_StockTable.StageId  = Trs_ProdEntry_SourceStageDtl.SourceStageId where coycode=@Oldcoycode and Ordid=@OldOrdid and StyleNo=@OldStyleNo and LotID = @LotId and  GodId=@OldGodId and PartyId=@OldPartyId    and Pcs_StockTableQty.SizeId=@OldSizeId  and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When (IsNull(@Rework,0) =0 OR IsNull(@Rework,0)=2) Then 0 Else @RejectionTypeId End And ISNULL(Pcs_StockTable.EmpID,0) =0 )   

Begin     

If @OldStageId<>1 And ( Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@OldStageId)='Piece'  
Begin  
Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty+(@OldStockQty*IsNull(OrderQtyDtl.PcsPerColor,1)) From Pcs_StockTableQty    Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId  INNER JOIN OrderQtyDtl on Pcs_StockTable.Ordid = OrderQtyDtl.Ordid And Pcs_StockTable.Styleno = OrderQtyDtl.StyleNo And OrderQtyDtl.ColId = Pcs_StockTableQty.Colid   And    OrderQtyDtl.SizeId = Pcs_StockTableQty.SizeId And OrderQtyDtl.PartId = Pcs_StockTable.PartID  LEFT OUTER JOIN Mas_Lot ON OrderQtyDtl.LotNo = Mas_Lot.LotName	 INNER JOIN Trs_ProdEntry_SourceStageDtl ON  Pcs_StockTable.PartId = Trs_ProdEntry_SourceStageDtl.PartId And    Pcs_StockTable.StageId  = Trs_ProdEntry_SourceStageDtl.SourceStageId where Trs_ProdEntry_SourceStageDtl.Id = @OldId and coycode=@Oldcoycode and Pcs_StockTable.Ordid=@OldOrdid and Pcs_StockTable.StyleNo=@OldStyleNo and LotID = @LotId and GodId=@OldGodId and PartyId=@OldPartyId     And Pcs_StockTableQty.SizeId=@OldSizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 0 Else @RejectionTypeId End   And ISNULL(Pcs_StockTable.EmpID,0) = 0 And CmbClrID = @OldColId

End   
End   
Else  
 Begin     
	If @OldStageId<>1  
	Begin   
	INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,ProductionQty,GoodPcsFlag,RejectionTypeId) VALUES (@OldPcsStockId,@OldColId,@OldSizeid,@OldStockQty,@OldStockQty,Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 'G' Else 'M' End,   Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 0 Else @RejectionTypeId End)   
	End   
If @OldStageId<>1 And (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@OldStageId)='Piece'   
begin    
Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-(@OldStockQty * isnull(orderqtydtl.pcspercolor,1)) ,  Pcs_StockTableQty.ProductionQty=Pcs_StockTableQty.ProductionQty-@OldStockQty From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId  INNER JOIN OrderQtyDtl on Pcs_StockTable.Ordid = OrderQtyDtl.Ordid And Pcs_StockTable.Styleno = OrderQtyDtl.StyleNo   And OrderQtyDtl.CmbClrID = Pcs_StockTableQty.Colid  And OrderQtyDtl.SizeId = Pcs_StockTableQty.SizeId  /*And OrderQtyDtl.PartId = Pcs_StockTable.PartID  */ LEFT OUTER JOIN Mas_Lot ON OrderQtyDtl.LotNo = Mas_Lot.LotName	 where coycode=@Oldcoycode and Pcs_StockTable.Ordid=@OldOrdid   and Pcs_StockTable.StyleNo=@OldStyleNo and LotID = @LotId and Stageid=@OldStageId and Pcs_StockTable.PartId=@OldPartId and GodId=@OldGodId and PartyId=@OldPartyId and Pcs_StockTableQty.ColId=@OldColid and Pcs_StockTableQty.SizeId=@OldSizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0 And ISNULL(Pcs_StockTable.EmpID,0) = 0   End   
End   
End   
Else   
begin   
If @OldStageId<>1   
Begin  
Select @OldPcsStockId=Max(IsNull(PcsStockId,0))+1 From Pcs_StockTable   
INSERT INTO Pcs_StockTable (Coycode,Ordid,styleNo,Stageid,PartId,SeqNo,GodId,PcsStockId,PartyId,LotId) VALUES (@OldCoycode,@OldOrdid,@OldStyleNo,@OldSourceStageid,@OldPartId,@OldSeqNo,@OldGodId,@OldPcsStockId,@OldPartyId,@LotId)    
INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,ProductionQty,GoodPcsFlag,RejectionTypeId) VALUES (@OldPcsStockId,@OldColId,@OldSizeid,@OldStockQty,@OldStockQty,Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 'G' Else 'M' End,Case When (IsNull(@Rework,0)=0 Or IsNull(@Rework,0)=2) Then 0 Else @RejectionTypeId End)   
End   
End   
End   
End   
if  @OldFinalStage='S'  
BEGIN   /*Print 'as7'  */ 
print 'a1'
/* Update The OldStock Pcs into Previous Stage */
If EXISTS   (select * from Pcs_StockTable Inner Join Pcs_StockTableQty On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@Oldcoycode and Ordid=@OldOrdid and StyleNo=@OldStyleNo and LotId = @LotID and Stageid=@OldSourceStageid and PartId=@OldPartId and GodId=@OldGodId and  PartyId=@OldPartyId And ISNULL(Pcs_StockTable.EmpID,0) =0)     
begin       
print 'a2'
Select @OldPcsStockId=PcsStockId From Pcs_StockTable where coycode=@Oldcoycode and Ordid=@OldOrdid and StyleNo=@OldStyleNo and LotId = @LotID and Stageid=@OldStageid and PartId=@OldPartId and GodId=@OldGodId and PartyId=@OldPartyId   And ISNULL(Pcs_StockTable.EmpID,0) = 0
print 'a3'
print @OldPcsStockid 
If EXISTS (select * from Pcs_StockTable Inner Join Pcs_StockTableQty On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@Oldcoycode and    Ordid=@OldOrdid and StyleNo=@OldStyleNo and LotId = @LotId and Stageid=@OldSourceStageid and PartId=@OldPartId and GodId=@OldGodId and PartyId=@OldPartyId and Pcs_StockTableQty.ColId=@OldColid and Pcs_StockTableQty.SizeId=@OldSizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When    (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 0 Else @RejectionTypeId End And ISNULL(Pcs_StockTable.EmpID,0) = 0)  
Begin    /*Print 'as9' */  
print 'a4'
If @OldStageId<>1 And (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@OldStageId)='Piece'    
Begin  
print 'a5'
print @OldStockQty
Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty+@OldStockQty,
Pcs_StockTableQty.ProductionQty=Pcs_StockTableQty.ProductionQty+@OldStockQty From Pcs_StockTableQty   Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@Oldcoycode and Ordid=@OldOrdid and StyleNo=@OldStyleNo and LotId = @LotId and Stageid=@OldSourceStageid and PartId=@OldPartId and GodId=@OldGodId and PartyId=@OldPartyId and Pcs_StockTableQty.ColId=@OldColid and Pcs_StockTableQty.SizeId=@OldSizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When    (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 0 Else @RejectionTypeId End  And ISNULL(Pcs_StockTable.EmpID,0) = 0
End  
End   
Else   
Begin  
If @OldStageId<>1  
Begin      
print 'a6'
INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,ProductionQty,GoodPcsFlag,RejectionTypeId) VALUES (@OldPcsStockId,@OldColId,@OldSizeid,@OldStockQty,@OldStockQty,Case When    (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 'G' Else 'M' End,Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 0 Else @RejectionTypeId End)   
End   
End   
End   
Else   
begin   
If @OldStageId<>1   
Begin   
print 'a7'
Select @OldPcsStockId=Max(IsNull(PcsStockId,0))+1 From Pcs_StockTable   
INSERT INTO  Pcs_StockTable 
(Coycode,Ordid,styleNo,Stageid,PartId,SeqNo,GodId,PcsStockId,PartyId,LotId) VALUES (@OldCoycode,@OldOrdid,@OldStyleNo,@OldSourceStageid,@OldPartId,@OldSeqNo,@OldGodId,@OldPcsStockId,@OldPartyId,@LotId)    
INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,ProductionQty,GoodPcsFlag,RejectionTypeId) VALUES (@OldPcsStockId,@OldColId,@OldSizeid,@OldStockQty,@OldStockQty,Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 'G' Else 'M' End,Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 0 Else @RejectionTypeId End)  
End  
End  
End  
Select @Id=@Id   
Select @Coycode = CoyId From Trs_ProdEntry Where Id=@Id   
select @PartyId = 0  
SELECT @Ordid = OrdId From Trs_ProdEntry    Where Id=@Id   
SELECT @StyleNo = StyleNo From Trs_ProdEntry Where Id=@Id   
SELECT @Stageid = StageId From Trs_ProdEntry Where Id=@Id  
SELECT @PartId = PartId From Trs_ProdEntry Where Id=@Id   
SELECT @GodId = GodId From Trs_ProdEntry Where Id=@Id   
Select @SeqNo = SeqNo From Trs_ProdEntry Inner Join Prod_Sequence On Trs_ProdEntry.OrdId=Prod_Sequence.OrdId And Trs_ProdEntry.StyleNo=Prod_Sequence.StyleNo And Trs_ProdEntry.StageId=Prod_Sequence.StageId    Where Id=@Id  
SELECT @FinalStage = Mas_Dept.SemiFinish From Trs_ProdEntry Inner Join Mas_JobWrkComp On Trs_ProdEntry.StageId=Mas_JobWrkComp.Id Inner Join Mas_Dept On
Mas_JobWrkComp.DeptId=Mas_Dept.DeptId Where Trs_ProdEntry.Id=@Id  
SELECT @ColId = ClrId From Trs_ProdEntry Where Id=@Id   
SELECT @SizeId = @SizeId   
Select @SourceStageId = SourceStageId From Trs_ProdEntry Where Id=@Id   
SELECT @StockQty = @ProdPcs   
print 'a8'
begin   
if @FinalStage='F'      
begin    
If EXISTS (select * from Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId =@LotID and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId And ISNULL(Pcs_StockTable.EmpID,0) = @Src_LineID)    
begin    
Select @PcsStockId=PcsStockId From Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotID = @LotID and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId  And ISNULL(Pcs_StockTable.EmpID,0) = @Src_LineID
If EXISTS    (select * from Pcs_StockTable Inner Join
 Pcs_StockTableQty On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotID = @LotID and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.ColId=@Colid and  Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0 And ISNULL(Pcs_StockTable.EmpID,0) = @Src_LineID )     
Begin   
If @StageId<>1 And (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Piece'   
Begin     
Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty+(@StockQty),
Pcs_StockTableQty.ProductionQty=Pcs_StockTableQty.ProductionQty+@StockQty From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId  INNER JOIN OrderQtyDtl on Pcs_StockTable.Ordid = OrderQtyDtl.Ordid    And Pcs_StockTable.Styleno = OrderQtyDtl.StyleNo And OrderQtyDtl.CmbClrID = Pcs_StockTableQty.Colid  And OrderQtyDtl.SizeId = Pcs_StockTableQty.SizeId /*And OrderQ
tyDtl.PartId = Pcs_StockTable.PartID */ LEFT OUTER JOIN Mas_Lot ON OrderQtyDtl.LotNo = Mas_Lot.LotName	   where  coycode=@coycode and Pcs_StockTable.Ordid=@Ordid and Pcs_StockTable.StyleNo=@StyleNo and LotId = @LotId and Stageid=@Stageid and Pcs_StockTable.PartId=@PartId and GodId=@GodId and PartyId=@PartyId    and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0  And ISNULL(Pcs_StockTable.EmpID,0) = @Src_LineID 

 End   
End   
Else   
Begin   
INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,ProductionQty,GoodPcsFlag,RejectionTypeId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,@StockQty,'G',0)  
End   
End  
Else 
begin   
Select @PcsStockId=Max(IsNull(PcsStockId,0))+1 From Pcs_StockTable      
INSERT INTO Pcs_StockTable (Coycode,Ordid,styleNo,Stageid,PartId,SeqNo,GodId,PcsStockId,PartyId,LotID,EmpID) VALUES (@Coycode,@Ordid,@StyleNo,@Stageid,@PartId,@SeqNo,@GodId,@PcsStockId,@PartyId,@LotID,@Src_LineID)   

INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,ProductionQty,GoodPcsFlag,RejectionTypeId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,@StockQty,'G',0)  
End   
If @StageId<>1 And (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Piece'   
  begin  /* colid removed by asl for packing qty reduce means update in pre stage - in above already added qty here diff qty minus */  
  /* /IsNull(OrderQtyDtl.PcsPerColor,1) */

Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-(@StockQty*IsNull(OrderQtyDtl.PcsPerColor,1)) From Pcs_StockTableQty Inner Join Pcs_StockTable  On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId  INNER JOIN OrderQtyDtl on Pcs_StockTable.Ordid = OrderQtyDtl.Ordid And Pcs_StockTable.Styleno = OrderQtyDtl.StyleNo    And OrderQtyDtl.ColId = Pcs_StockTableQty.Colid  And OrderQtyDtl.SizeId = Pcs_StockTableQty.SizeId And OrderQtyDtl.PartId = Pcs_StockTable.PartID  LEFT OUTER JOIN Mas_Lot ON OrderQtyDtl.LotNo = Mas_Lot.LotName	 INNER JOIN Trs_ProdEntry_SourceStageDtl ON  Pcs_StockTable.PartId = Trs_ProdEntry_SourceStageDtl.PartId And Pcs_StockTable.StageId  = Trs_ProdEntry_SourceStageDtl.SourceStageId  where Trs_ProdEntry_SourceStageDtl.id = @id and coycode=@coycode and Pcs_StockTable.Ordid=@Ordid    and Pcs_StockTable.StyleNo=@StyleNo and 
LotId = @LotId  and GodId=@GodId and PartyId=@PartyId And  Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 0 Else @RejectionTypeId End And ISNULL(Pcs_StockTable.EmpID,0) = @Src_LineID And CmbClrID = @OldColId
Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-(@OldStockQty),   Pcs_StockTableQty.ProductionQty=Pcs_StockTableQty.ProductionQty-
@OldStockQty From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId  INNER JOIN OrderQtyDtl on Pcs_StockTable.Ordid = OrderQtyDtl.Ordid And Pcs_StockTable.Styleno = OrderQtyDtl.StyleNo And OrderQtyDtl.CmbClrID = Pcs_StockTableQty.Colid  And OrderQtyDtl.SizeId = Pcs_StockTableQty.SizeId /*And OrderQtyDtl.PartId = Pcs_StockTable.PartID  */  LEFT OUTER JOIN Mas_Lot ON     OrderQtyDtl.LotNo = Mas_Lot.LotName	 where coycode=@Oldcoycode and Pcs_StockTable.Ordid=@OldOrdid and Pcs_StockTable.StyleNo=@OldStyleNo and LotId =@Lotid and Stageid=@OldStageId and Pcs_StockTable.PartId=@OldPartId and GodId=@OldGodId and PartyId=@OldPartyId and Pcs_StockTableQty.ColId=@OldColid and Pcs_StockTableQty.SizeId=@OldSizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0  And ISNULL(Pcs_StockTable.EmpID,0) = @Src_LineID  End  
End  
End  
Begin 
if  @FinalStage='S'      
BEGIN    
print 'a9'
print @StageID 
/* Old Qty Reduced from the Current Stage */
If EXISTS (select * from Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId =@LotId and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId And ISNULL(Pcs_StockTable.EmpID,0) = @Src_LineID )    
begin   
print 'a10'
Select @PcsStockId=PcsStockId From Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotID and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId  And ISNULL(Pcs_StockTable.EmpID,0) = @Src_LineID
print @PcsStockId 
If EXISTS (select * from Pcs_StockTable Inner Join Pcs_StockTableQty On    Pcs_StockTable.PcsStockId= Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId =@LotID and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0 And ISNULL(Pcs_StockTable.EmpID,0) = @Src_LineID )  
Begin  
print 'a11'
If @StageId<>1 And (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Piece'  
begin   
print 'a12'
Update Pcs_StockTableQty Set  Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty+@StockQty,
Pcs_StockTableQty.ProductionQty=Pcs_StockTableQty.ProductionQty+@StockQty From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId =@Lotid and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId    and
 IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0 And ISNULL(Pcs_StockTable.EmpID,0) = @Src_LineID  End

  /*Aslam  below qry*/  
 If @StageId=1 And (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Piece'   
begin  
Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty+@StockQty,
Pcs_StockTableQty.ProductionQty =Pcs_StockTableQty.ProductionQty+@StockQty From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId    where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId =@LotId and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0  And ISNULL(Pcs_StockTable.EmpID,0) = @Src_LineID  End   
If @StageId=-2 And (Select IsNull(PcsType,'Piece')
 From Mas_JobWrkComp Where Id=@StageId)='Bit'   
begin    
print 'a13'
print @StockQty
print @Src_LineID 
Update Pcs_StockTableQty Set    Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty+@StockQty,
Pcs_StockTableQty.ProductionQty =Pcs_StockTableQty.ProductionQty+@StockQty From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId =@LotId and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='G'    and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0 And ISNULL(Pcs_StockTable.EmpID,0) = @Src_LineID  End   
End  
Else   
Begin    

INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,ProductionQty,GoodPcsFlag,RejectionTypeId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,@StockQty,'G',0)    
End  
End  
Else   
begin    
Select @PcsStockId=Max(IsNull(PcsStockId,0))+1 From Pcs_StockTable    
INSERT INTO Pcs_StockTable (Coycode,Ordid,styleNo,Stageid,PartId,SeqNo,GodId,PcsStockId,PartyId,LotId,EmpID) VALUES (@Coycode,@Ordid,@StyleNo,@Stageid,@PartId,@SeqNo,@GodId,@PcsStockId,@PartyId,@LotId,@Src_LineID)     

INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,ProductionQty,GoodPcsFlag,RejectionTypeId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,@StockQty,'G',0)   
End   
If @StageId<>1 And (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Piece'  
begin  
print 'a14'
print @StockQty
Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-@StockQty From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo  and LotId =@LotID and Stageid=@SourceStageId and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When (IsNull(@Rework,0 )=0 OR IsNull(@Rework,0)=2) Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 0 Else @RejectionTypeId End    And ISNULL(Pcs_StockTable.EmpID,0) = 0
print 'a15'
print @OldStockQty

Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-@OldStockQty,    Pcs_StockTableQty.ProductionQty=Pcs_StockTableQty.ProductionQty-@OldStockQty From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=
Pcs_StockTableQty.PcsStockId where coycode=@Oldcoycode and Ordid=@OldOrdid and StyleNo=@OldStyleNo and LotId =@Lotid and Stageid=@OldStageId and PartId=@OldPartId and GodId=@OldGodId and PartyId=@OldPartyId and Pcs_StockTableQty.ColId=@OldColid and Pcs_StockTableQty.SizeId=@OldSizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0 And ISNULL(Pcs_StockTable.EmpID,0) = @Src_LineID  

  End /*Aslam below query*/   
 If @StageId=1 And (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Piece'    
Begin     
Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-@OldStockQty, Pcs_StockTableQty.ProductionQty=Pcs_StockTableQty.ProductionQty-@OldStockQty From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@Oldcoycode and Ordid=@OldOrdid and StyleNo=@OldStyleNo and LotId=@LotID and Stageid=@OldStageId and PartId=@OldPartId    and GodId=@OldGodId and PartyId=@OldPartyId and Pcs_StockTableQty.ColId=@OldColid and Pcs_StockTableQty.SizeId=@OldSizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0   And ISNULL(Pcs_StockTable.EmpID,0) = 0  
End 
If @StageId=-2 And (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Bit'    
Begin       
Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-@OldStockQty, Pcs_StockTableQty.ProductionQty=Pcs_StockTableQty.ProductionQty-@OldStockQty From Pcs_StockTableQty     Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@Oldcoycode and Ordid=@OldOrdid and StyleNo=@OldStyleNo and LotId=@LotID and Stageid=@OldStageId and PartId=@OldPartId and GodId=@OldGodId and PartyId=@OldPartyId and Pcs_StockTableQty.ColId=@OldColid and Pcs_StockTableQty.SizeId=@OldSizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0    And ISNULL(Pcs_StockTable.EmpID,0) = @Src_LineID  
End  
End     
End 
