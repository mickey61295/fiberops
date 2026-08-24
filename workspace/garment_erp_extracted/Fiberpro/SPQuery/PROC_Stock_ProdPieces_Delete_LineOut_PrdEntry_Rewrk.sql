/*;=============================================   
; Author           :  Global Software's    
; Create date      :  19/02/2026    
; Create By        :  ASLAM  
; Description      :  REWORK SIZE QTY MAKE 0 - DELETE
; Change Person    :  ASLAM
; Last Change Date :  19/02/2026 10.50 AM 
; =============================================  */  

CREATE Procedure PROC_Stock_ProdPieces_Delete_LineOut_PrdEntry_Rewrk (@Id int,@sizeId int,@ProdPcs Int) AS  DECLARE @Coycode Int,@Ordid Int,@StyleNo Varchar(20),@StageId Int,@PartId Int,@GodId Int,@ColId Int,@StockQty Int,@SourceStageId Int,@FinalStage Char(1),
@SeqNo int,@PartyId Int,@PcsStockId Int,@Rework Int,@RejectionTypeId Int ,@SqlCond as Varchar(100),@LotID int  ,@PcsPerColor int,@LotNo Varchar(30)   ,@LotRequired char(1)  ,@SrcLineID int
Select @Id=@Id     
Select  @Coycode = CoyId From Trs_ProdEntry Where Id=@Id      
select @PartyId = 0      
SELECT @Ordid = OrdId From Trs_ProdEntry Where Id=@Id      
SELECT @StyleNo = StyleNo From Trs_ProdEntry Where Id=@Id      
SELECT @LotID = IsNull(LotID,0) From Trs_ProdEntry Where Id=@Id      
SELECT @LotNo = LotName from Mas_Lot Where LotSNo = @LotID     
SELECT @Stageid = StageId From Trs_ProdEntry Where Id=@Id       
SELECT @PartId = PartId From Trs_ProdEntry Where Id=@Id     
SELECT @GodId = GodId From Trs_ProdEntry Where Id=@Id     
SELECT @Rework = Rework From Trs_ProdEntry Where Id=@Id      
SELECT @RejectionTypeId = RejectionTypeId From Trs_ProdEntry Where Id=@Id      
Select @SeqNo = SeqNo From Trs_ProdEntry Inner Join Prod_Sequence On Trs_ProdEntry.OrdId=Prod_Sequence.OrdId And Trs_ProdEntry.StyleNo=Prod_Sequence.StyleNo And Trs_ProdEntry.StageId=Prod_Sequence.StageId Where Id=@Id     
SELECT @FinalStage = Mas_Dept.SemiFinish From Trs_ProdEntry Inner Join Mas_JobWrkComp On Trs_ProdEntry.StageId=Mas_JobWrkComp.Id Inner Join Mas_Dept On Mas_JobWrkComp.DeptId=Mas_Dept.DeptId Where Trs_ProdEntry.Id=@Id      
SELECT @ColId = ClrId From Trs_ProdEntry Where Id=@Id     
Select @SourceStageId=SourceStageId From Trs_ProdEntry Where Id=@Id      
Select @SrcLineID =isnull(LineID ,0) From Trs_ProdEntry Where Id=@Id      
SELECT @StockQty = @ProdPcs     
SELECT @LotRequired = isnull(Lotwisestock,'N') From Ordermas2 where Ordid = @Ordid 
print 'aslam'
if @FinalStage='F'   
SELECT @PcsPerColor = isNull(Avg(PcsPerColor),1) FRom OrderQtyDtl Where Ordid = @Ordid And StyleNo=@StyleNo And LotNo = @Lotno and  ColID in (@ColId)   /*CmbClrID in (@ColId) */   
Else   
SELECT @PcsPerColor = isNull(Avg(PcsPerColor),1) FRom OrderQtyDtl Where Ordid = @Ordid And StyleNo=@StyleNo And LotNo = @Lotno and ColID in (@ColId) 
Begin    
DECLARE LINE_CURSOR   CURSOR FOR    Select Id,SizID,ProdPcs FROM Trs_ProdentryQty Where ID=@Id and SizId = @SizeID     
OPEN LINE_CURSOR     
FETCH NEXT FROM LINE_CURSOR INTO @id,@Sizeid,@ProdPcs      
WHILE @@FETCH_STATUS = 0          
BEGIN      
 if @FinalStage='F'      
 Begin
print 'aaa'       
UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty-@ProdPcs,ProductionQty=Pcs_StockTableQty.ProductionQty-@ProdPcs From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_Prodentry On Pcs_StockTable.Coycode=Trs_Prodentry.CoyId And Pcs_StockTable.OrdId=Trs_Prodentry.OrdId And Pcs_StockTable.StyleNo=Trs_Prodentry.StyleNo  And Pcs_StockTable.LotId=Trs_Prodentry.LotID And Pcs_StockTable.StageId=
Trs_Prodentry.StageId And Pcs_StockTable.PartId=Trs_Prodentry.PartId And Pcs_StockTable.GodId=Trs_Prodentry.GodId And Pcs_StockTableQty.ColId=Trs_Prodentry.ClrId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0  WHERE Pcs_StockTable.coycode=Trs_Prodentry.CoyId And Pcs_StockTable.Ordid=Trs_Prodentry.Ordid and Pcs_StockTable.StyleNo=Trs_Prodentry.StyleNo And Pcs_StockTable.LotId=Trs_Prodentry.LotID and Pcs_StockTable.Stageid=Trs_Prodentry.Stageid And Pcs_StockTable.PartId=Trs_Prodentry.PartId and Pcs_StockTable.GodId=Trs_Prodentry.GodId and Pcs_StockTableQty.Colid=Trs_Prodentry.ClrId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0 and Partyid=@Partyid And Trs_Prodentry.Id=@Id And ISNULL(Pcs_StockTable.EmpID,0) = @SrcLineID    
End     
if @FinalStage='S'     
Begin        
UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty-@ProdPcs,ProductionQty=
Pcs_StockTableQty.ProductionQty-@ProdPcs From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_Prodentry On Pcs_StockTable.Coycode=Trs_Prodentry.CoyId And Pcs_StockTable.OrdId=Trs_Prodentry.OrdId And Pcs_StockTable.StyleNo=Trs_Prodentry.StyleNo And
 Pcs_StockTable.LotId=Trs_Prodentry.LotID And Pcs_StockTable.StageId=Trs_Prodentry.StageId And Pcs_StockTable.PartId=Trs_Prodentry.PartId And Pcs_StockTable.GodId=Trs_Prodentry.GodId And Pcs_StockTableQty.ColId=Trs_Prodentry.ClrId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0 WHERE Pcs_StockTable.coycode=Trs_Prodentry.CoyId And Pcs_StockTable.Ordid=Trs_Prodentry.Ordid and Pcs_StockTable.StyleNo=Trs_Prodentry.StyleNo And Pcs_StockTable.LotId=Trs_Prodentry.LotID and Pcs_StockTable.Stageid=Trs_Prodentry.Stageid And Pcs_StockTable.PartId=Trs_Prodentry.PartId and Pcs_StockTable.GodId=Trs_Prodentry.GodId and Pcs_StockTableQty.Colid=Trs_Prodentry.ClrId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0 and Partyid=@Partyid And Trs_Prodentry.Id=@Id     And ISNULL(Pcs_StockTable.EmpID,0) = @SrcLineID
End     
If @SourceStageid<>0 And @StageId<>1 And @FinalStage='S' And (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Piece'  
 Begin      
If EXISTS (select * from Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotID = @LotID and Stageid=@SourceStageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId And ISNULL(Pcs_StockTable.EmpID,0) = 0)   
   begin   
  Select @PcsStockId=PcsStockId From Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotID = @LotID  and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId   And ISNULL(Pcs_StockTable.EmpID,0) = 0 

If EXISTS (select * from Pcs_StockTable 
Inner Join Pcs_StockTableQty On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo And LotId=@LotID and Stageid=@SourceStageid and PartId=@PartId and GodId=@GodId and  PartyId=@PartyId and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2 )Then 0 Else @RejectionTypeId End And ISNULL(Pcs_StockTable.EmpID,0) = 0)       
Begin      
UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty+@ProdPcs From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_Prodentry On Pcs_StockTable.Coycode=Trs_Prodentry.CoyId And  Pcs_StockTable.OrdId=Trs_Prodentry.OrdId And Pcs_StockTable.StyleNo=Trs_Prodentry.StyleNo And Pcs_StockTable.LotId=Trs_Prodentry.LotID And Pcs_StockTable.PartId=Trs_Prodentry.PartId And Pcs_StockTable.GodId=Trs_Prodentry.GodId And Pcs_StockTableQty.ColId=Trs_Prodentry.ClrId and    IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2)Then 'G' Else 'M' End    and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2 )Then 0 Else @RejectionTypeId End 	And Pcs_StockTableQty.SizeId=@SizeId /*	and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When IsNull(@Rework,0)=0 Then 'G' Else 'M' End 	and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2 )Then 0 Else @RejectionTypeId End */ 	WHERE Pcs_StockTable.coycode=Trs_Prodentry.CoyId And Pcs_StockTable.Ordid=Trs_Prodentry.Ordid and Pcs_StockTable.StyleNo=Trs_Prodentry.StyleNo And Pcs_StockTable.LotId=Trs_Prodentry.LotID And Pcs_StockTable.PartId=Trs_Prodentry.PartId
 and Pcs_StockTable.GodId=Trs_Prodentry.GodId and Pcs_StockTableQty.Colid=Trs_Prodentry.ClrId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2)Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2 )Then 0 Else @RejectionTypeId End and Partyid=@Partyid And Pcs_StockTable.StageId=@SourceStageId And Trs_Prodentry.Id=@Id And ISNULL(Pcs_StockTable.EmpID,0) = 0  
End    
Else   
Begin    
INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,GoodPcsFlag,RejectionTypeId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 'G' Else 'M' End,Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2 ) Then 0 Else @RejectionTypeId End ) 
End     
End    
Else   
begin         
Select @PcsStockId=Max(IsNull(PcsStockId,0))+1 From Pcs_StockTable 
INSERT INTO Pcs_StockTable (Coycode,Ordid,styleNo,Stageid,PartId,SeqNo,GodId,PcsStockId,PartyId,LotID,EmpID) VALUES (@Coycode,@Ordid,@StyleNo,@SourceStageid,@PartId,@SeqNo,@GodId,@PcsStockId,@PartyId,@LotID,@SrcLineID)    

INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,GoodPcsFlag,RejectionTypeId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 'G' Else 'M' End,Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2 ) Then 0 Else @RejectionTypeId End)   
  End    
End    
If  @StageId<>1 And @FinalStage='F' And (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Piece'  
Begin    
If EXISTS (select * from Pcs_StockTable INNER JOIN Trs_ProdEntry_SourceStageDtl ON  Pcs_StockTable.PartId = Trs_ProdEntry_SourceStageDtl.PartId And Pcs_StockTable.StageId  = Trs_ProdEntry_SourceStageDtl.SourceStageId  where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and GodId=@GodId and PartyId=@PartyId And ISNULL(Pcs_StockTable.EmpID,0) = @SrcLineID)      
begin 
print 'bbb'  
Select @PcsStockId=PcsStockId From Pcs_StockTable INNER JOIN Trs_ProdEntry_SourceStageDtl ON  Pcs_StockTable.PartId = Trs_ProdEntry_SourceStageDtl.PartId And Pcs_StockTable.StageId  = Trs_ProdEntry_SourceStageDtl.SourceStageId  where coycode=@coycode and 
Ordid=@Ordid and StyleNo=@StyleNo and  GodId=@GodId and PartyId=@PartyId and Trs_ProdEntry_SourceStageDtl.ID  = @ID   And ISNULL(Pcs_StockTable.EmpID,0) = @SrcLineID
print @pcsstockid
If EXISTS (select * from Pcs_StockTable Inner Join Pcs_StockTableQty On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId INNER JOIN Trs_ProdEntry_SourceStageDtl ON  Pcs_StockTable.PartId = Trs_ProdEntry_SourceStageDtl.PartId And Pcs_StockTable.StageId  = Trs_ProdEntry_SourceStageDtl.SourceStageId  where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotID  and GodId=@GodId and 
PartyId=@PartyId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')= Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2 )Then 0 Else @RejectionTypeId End And ISNULL(Pcs_StockTable.EmpID,0) = @SrcLineID)   
Begin     
  if @LotRequired = 'Y'
  BEGIN
 
 UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty+(@ProdPcs*PcsPerColor) From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_Prodentry On Pcs_StockTable.Coycode=Trs_Prodentry.CoyId And 
 Pcs_StockTable.OrdId=Trs_Prodentry.OrdId And Pcs_StockTable.StyleNo=Trs_Prodentry.StyleNo And Pcs_StockTable.LotId=Trs_Prodentry.LotID And Pcs_StockTable.GodId=Trs_Prodentry.GodId And Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 0 Else @RejectionTypeId End INNER JOIN Trs_ProdEntry_SourceStageDtl ON  Pcs_StockTable.PartId = Trs_ProdEntry_SourceStageDtl.PartId And Pcs_StockTable.StageId  = Trs_ProdEntry_SourceStageDtl.SourceStageId   inner join (Select Distinct Ordid,styleno,CmbClrID,ColID,lotno,Partid,SizeId,isnull(Avg(PcsPerColor),1) as PcsPerColor from OrderQtyDtl GROUP BY Ordid,styleno,CmbClrID,ColID,Partid,Lotno,SizeId) OrderQtyDtl ON  Pcs_StockTable.Ordid = OrderQtyDtl.Ordid And Pcs_StockTable.Styleno = OrderQtyDtl.StyleNo And Pcs_StockTableQty.ColId = OrderQtyDtl.ColID  And Trs_Prodentry.LotNo = OrderQtyDtl.LotNo   And Pcs_StockTable.PartId = OrderQtyDtl.PartID And Pcs_StockTableQty.SizeId = OrderQtyDtl.SizeId     and Trs_ProdEntry_SourceStageDtl.Id = @Id  And Trs_ProdEntry_SourceStageDtl.Colid = Pcs_StockTableQty.ColId   WHERE Pcs_StockTable.coycode=Trs_Prodentry.CoyId And Pcs_StockTable.Ordid=Trs_Prodentry.Ordid and Pcs_StockTable.StyleNo=Trs_Prodentry.StyleNo And Pcs_StockTable.LotId=Trs_Prodentry.LotID and Pcs_StockTable.GodId=Trs_Prodentry.GodId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 0 Else @RejectionTypeId End and Partyid=@Partyid  And Trs_Prodentry.Id=@Id and Trs_ProdEntry_SourceStageDtl.Id = @Id  And ISNULL(Pcs_StockTable.EmpID,0) = @SrcLineID   And CmbClrID = @ColId
  END 
  ELSE
  BEGIN
  UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty+(@ProdPcs*PcsPerColor) From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_Prodentry On Pcs_StockTable.Coycode=Trs_Prodentry.CoyId And 
 Pcs_StockTable.OrdId=Trs_Prodentry.OrdId And Pcs_StockTable.StyleNo=Trs_Prodentry.StyleNo And Pcs_StockTable.LotId=Trs_Prodentry.LotID And Pcs_StockTable.GodId=Trs_Prodentry.GodId And Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2 )Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 0 Else @RejectionTypeId End INNER JOIN Trs_ProdEntry_SourceStageDtl ON  Pcs_StockTable.PartId = Trs_ProdEntry_SourceStageDtl.PartId And Pcs_StockTable.StageId  = Trs_ProdEntry_SourceStageDtl.SourceStageId   inner join (Select Distinct Ordid,styleno,CmbClrID,ColID,Partid,SizeId,isnull(Avg(PcsPerColor),1) as PcsPerColor from OrderQtyDtl GROUP BY Ordid,styleno,CmbClrID,ColID,Partid,Lotno,SizeId) OrderQtyDtl ON  Pcs_StockTable.Ordid = OrderQtyDtl.Ordid And Pcs_StockTable.Styleno = OrderQtyDtl.StyleNo And Pcs_StockTableQty.ColId = OrderQtyDtl.ColID  And Pcs_StockTable.PartId = OrderQtyDtl.PartID And Pcs_StockTableQty.SizeId = OrderQtyDtl.SizeId     and Trs_ProdEntry_SourceStageDtl.Id = @Id WHERE Pcs_StockTable.coycode=Trs_Prodentry.CoyId And Pcs_StockTable.Ordid=Trs_Prodentry.Ordid and Pcs_StockTable.StyleNo=Trs_Prodentry.StyleNo And Pcs_StockTable.LotId=Trs_Prodentry.LotID and Pcs_StockTable.GodId=Trs_Prodentry.GodId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2)Then 0 Else @RejectionTypeId End and Partyid=@Partyid  And Trs_Prodentry.Id=@Id and Trs_ProdEntry_SourceStageDtl.Id = @Id     And ISNULL(Pcs_StockTable.EmpID,0) = @SrcLineID And CmbClrID = @ColId
 END
End    
Else    
Begin         
INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,GoodPcsFlag,RejectionTypeId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2 ) Then 'G' Else 'M' End,Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 0 Else @RejectionTypeId End) 
End 
End  
Else  
begin  
Select @PcsStockId=Max(IsNull(PcsStockId,0))+1 From Pcs_StockTable        
INSERT INTO Pcs_StockTable (Coycode,Ordid,styleNo,Stageid,PartId,SeqNo,GodId,PcsStockId,PartyId,LotID,EmpID) VALUES (@Coycode,@Ordid,@StyleNo,@SourceStageid,@PartId,@SeqNo,@GodId,@PcsStockId,@PartyId,@LotID,@SrcLineID) 
INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,GoodPcsFlag,RejectionTypeId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2 ) Then 'G' Else 'M' End,Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 0 Else @RejectionTypeId End)  
End    
End     
 FETCH NEXT FROM LINE_CURSOR INTO @id,@Sizeid,@ProdPcs      
END      
CLOSE LINE_CURSOR        
DEALLOCATE LINE_CURSOR       
SET NOCOUNT OFF     
END