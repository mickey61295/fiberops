/*;=============================================   

; Author           :  Global Software's    

; Create date      :  17/08/2022    

; Create By        :  ASLAM  

; Description      :  QUERY

; Change Person    :  ASLAM

; Last Change Date :  06/12/2024 09.10 AM 

; =============================================  */  

CREATE PROCEDURE PROC_Stock_ProdPieces_Delete1 (@Id int) AS  DECLARE @Coycode Int,@Ordid Int,@StyleNo Varchar(20),@StageId Int,@PartId Int,@GodId Int,@ColId Int,@StockQty Int,@SourceStageId Int,@FinalStage Char(1),@SeqNo int,@PartyId Int,@PcsStockId Int,@Rework Int,@RejectionTypeId Int ,@SqlCond as Varchar(100),@ProdPcs Int,@sizeId int ,@LOTID int,@LotNo varchar(100)  ,@Prod_Without_Lot_Despatch_WithLot as char(1), @LotwiseStockReqd   char(1)  

SELECT @LotwiseStockReqd = isNull(LotwiseStockReqd,'Y') from Options   

SELECT @Prod_Without_Lot_Despatch_WithLot = isNull(Prod_Without_Lot_Despatch_WithLot,'Y') from Options1  

Select @Id=@Id   

Select @Coycode = CoyId From Trs_ProdEntry Where Id=@Id   

select @PartyId = 0     

SELECT @Ordid = OrdId From Trs_ProdEntry Where Id=@Id   

SELECT @StyleNo = StyleNo From Trs_ProdEntry Where Id=@Id   

SELECT @Stageid = StageId From Trs_ProdEntry Where Id=@Id   

SELECT @PartId = PartId From Trs_ProdEntry Where Id=@Id   

SELECT @GodId = GodId From Trs_ProdEntry Where Id=@Id     

SELECT @Rework = Rework From Trs_ProdEntry Where Id=@Id   

SELECT @RejectionTypeId = RejectionTypeId From Trs_ProdEntry Where Id=@Id    

Select @SeqNo = SeqNo From Trs_ProdEntry Inner Join Prod_Sequence On Trs_ProdEntry.OrdId=Prod_Sequence.OrdId And Trs_ProdEntry.StyleNo=Prod_Sequence.StyleNo And Trs_ProdEntry.StageId=Prod_Sequence.StageId Where Id=@Id     



SELECT @FinalStage = Mas_Dept.SemiFinish From Trs_ProdEntry Inner Join Mas_JobWrkComp On Trs_ProdEntry.StageId=Mas_JobWrkComp.Id Inner Join Mas_Dept On Mas_JobWrkComp.DeptId=Mas_Dept.DeptId Where Trs_ProdEntry.Id=@Id    

SELECT @ColId = ClrId From Trs_ProdEntry Where Id=@Id   

Select @SourceStageId=SourceStageId From Trs_ProdEntry Where Id=@Id   

SELECT @StockQty = @ProdPcs    

SELECT @LotNo = IsNull(LotNo,'0') From Trs_Prodentry Where id=@Id   

if @LotNo<>'0'   

SELECT @LotID = IsNull(LotID,0) From Trs_ProdEntry Where Id=@Id  

else   

select @lotid=0   

if Rtrim(@LotwiseStockReqd) ='N' And RTrim(@Prod_Without_Lot_Despatch_WithLot)='Y'  

BEGIN  

SELECT @LotId = 0   

SELECT @LotNo ='' 

END  

begin  

DECLARE LINE_CURSOR CURSOR FOR Select Id,SizID,ProdPcs FROM Trs_ProdentryQty Where ID=@Id   

OPEN LINE_CURSOR FETCH NEXT FROM LINE_CURSOR INTO @id,@Sizeid,@ProdPcs   

WHILE @@FETCH_STATUS = 0   

BEGIN   

if @FinalStage='F'   

Begin  

if Rtrim(@LotwiseStockReqd) ='N' 

begin 

UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty-@ProdPcs,ProductionQty=Pcs_StockTableQty.ProductionQty-(@ProdPcs * IsNull(OrderQtyDtl.PcsPerColor,1)) From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_Prodentry On Pcs_StockTable.Coycode=Trs_Prodentry.CoyId And Pcs_StockTable.OrdId=Trs_Prodentry.OrdId And Pcs_StockTable.StyleNo=Trs_Prodentry.StyleNo And Pcs_StockTable.StageId=Trs_Prodentry.StageId And Pcs_StockTable.PartId=Trs_Prodentry.PartId And Pcs_StockTable.GodId=Trs_Prodentry.GodId And Pcs_StockTableQty.ColId=Trs_Prodentry.ClrId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0 

 INNER JOIN OrderQtyDtl on Pcs_StockTable.Ordid = OrderQtyDtl.Ordid And Pcs_StockTable.Styleno = OrderQtyDtl.StyleNo And OrderQtyDtl.CmbClrID = Pcs_StockTableQty.Colid And OrderQtyDtl.SizeId  = Pcs_StockTableQty.SizeId  WHERE Pcs_StockTable.coycode=Trs_Prodentry.CoyId And Pcs_StockTable.Ordid=Trs_Prodentry.Ordid and Pcs_StockTable.StyleNo=Trs_Prodentry.StyleNo and Pcs_StockTable.Stageid=Trs_Prodentry.Stageid And Pcs_StockTable.PartId=Trs_Prodentry.PartId and Pcs_StockTable.GodId=Trs_Prodentry.GodId and Pcs_StockTableQty.Colid=Trs_Prodentry.ClrId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0 and Partyid=@Partyid And Trs_Prodentry.Id=@Id and Pcs_StockTable.LotID = @LotID And ISNULL(Pcs_StockTable.EmpID,0) = 0

end 

else  

begin  

UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty-@ProdPcs,ProductionQty=Pcs_StockTableQty.ProductionQty-(@ProdPcs * IsNull(OrderQtyDtl.PcsPerColor,1)) From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.

PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_Prodentry On Pcs_StockTable.Coycode=Trs_Prodentry.CoyId And Pcs_StockTable.OrdId=Trs_Prodentry.OrdId And Pcs_StockTable.StyleNo=Trs_Prodentry.StyleNo And Pcs_StockTable.StageId=Trs_Prodentry.StageId And Pcs_StockTable.PartId=Trs_Prodentry.PartId And Pcs_StockTable.GodId=Trs_Prodentry.GodId And Pcs_StockTableQty.ColId=Trs_Prodentry.ClrId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0  INNER JOIN OrderQtyDtl on Pcs_StockTable.Ordid = OrderQtyDtl.Ordid And Pcs_StockTable.Styleno = OrderQtyDtl.StyleNo And OrderQtyDtl.CmbClrID = Pcs_StockTableQty.Colid And OrderQtyDtl.SizeId  = Pcs_StockTableQty.SizeId And OrderQtyDtl.lotno=@LotNo WHERE Pcs_StockTable.coycode=Trs_Prodentry.CoyId And Pcs_StockTable.Ordid=Trs_Prodentry.Ordid and Pcs_StockTable.StyleNo=Trs_Prodentry.StyleNo and Pcs_StockTable.Stageid=Trs_Prodentry.Stageid And Pcs_StockTable.PartId=Trs_Prodentry.PartId and Pcs_StockTable.GodId=Trs_Prodentry.
GodId and Pcs_StockTableQty.Colid=Trs_Prodentry.ClrId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0 and Partyid=@Partyid And Trs_Prodentry.Id=@Id and Pcs_StockTable.LotID = @LotID   And ISNULL(Pcs_StockTable.EmpID,0) = 0

end  

End   



if @FinalStage='S'  

Begin     

UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty-@ProdPcs,ProductionQty=Pcs_StockTableQty.ProductionQty-@ProdPcs From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.

PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_Prodentry On Pcs_StockTable.Coycode=Trs_Prodentry.CoyId And Pcs_StockTable.OrdId=Trs_Prodentry.OrdId And Pcs_StockTable.StyleNo=Trs_Prodentry.StyleNo And Pcs_StockTable.StageId=Trs_Prodentry.StageId And Pcs_StockTable.PartId=Trs_Prodentry.PartId And Pcs_StockTable.GodId=Trs_Prodentry.GodId And Pcs_StockTableQty.ColId=Trs_Prodentry.ClrId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0 WHERE Pcs_StockTable.coycode=Trs_Prodentry.CoyId And Pcs_StockTable.Ordid=Trs_Prodentry.Ordid and Pcs_StockTable.StyleNo=Trs_Prodentry.StyleNo and Pcs_StockTable.Stageid=Trs_Prodentry.Stageid And Pcs_StockTable.PartId=Trs_Prodentry.PartId and Pcs_StockTable.GodId=Trs_Prodentry.GodId and Pcs_StockTableQty.Colid=Trs_Prodentry.ClrId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0 and Partyid=@Partyid And Trs_Prodentry.Id=@Id  and Pcs_StockTable.lotid=@LOTID  And ISNULL(Pcs_StockTable.EmpID,0) = 0

End  

--And @StageId<>1

If @SourceStageid<>0  And @FinalStage='S' And (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Piece'  

Begin  

If EXISTS (select * from Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and  StyleNo=@StyleNo and Stageid=@SourceStageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId And ISNULL(Pcs_StockTable.EmpID,0) = 0)    

begin   

Select @PcsStockId=PcsStockId From Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and Stageid=@Stageid and

 PartId=@PartId and GodId=@GodId and PartyId=@PartyId And ISNULL(Pcs_StockTable.EmpID,0) = 0      



If EXISTS (select * from Pcs_StockTable Inner Join Pcs_StockTableQty On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and Stageid=@SourceStageid and PartId=@PartId and GodId=@GodId and 
 PartyId=@PartyId and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2 )Then 0 Else @RejectionTypeId End And ISNULL(Pcs_StockTable.EmpID,0) = 0)    

Begin   

UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty+@ProdPcs From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable

.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_Prodentry On Pcs_StockTable.Coycode=Trs_Prodentry.CoyId And  Pcs_StockTable.OrdId=Trs_Prodentry.OrdId And Pcs_StockTable.StyleNo=Trs_Prodentry.StyleNo And Pcs_StockTable.PartId=Trs_Prodentry.PartId And Pcs_StockTable.GodId=Trs_Prodentry.GodId And Pcs_StockTableQty.ColId=Trs_Prodentry.ClrId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2 )Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=
Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2 )Then 0 Else @RejectionTypeId End And Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2 )Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When (IsNull(@Rework,0
)=0 OR IsNull(@Rework,0)=2 )Then 0 Else @RejectionTypeId End WHERE Pcs_StockTable.coycode=Trs_Prodentry.CoyId And Pcs_StockTable.Ordid=Trs_Prodentry.Ordid and Pcs_StockTable.StyleNo=Trs_Prodentry.StyleNo And Pcs_StockTable.PartId=Trs_Prodentry.PartId and Pcs_StockTable.GodId=Trs_Prodentry.GodId and  Pcs_StockTableQty.Colid=Trs_Prodentry.ClrId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When (IsNull(@Rework,0) =0 OR IsNull(@Rework,0)=2 )Then 0 Else @RejectionTypeId End and Partyid=@Partyid And Pcs_StockTable.StageId=@SourceStageId And Trs_Prodentry.Id=@Id  and Pcs_StockTable.lotid=@LOTID   And ISNULL(Pcs_StockTable.EmpID,0) = 0

End  

Else  

Begin    

INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid

,StockQty,GoodPcsFlag,RejectionTypeId) VALUES(@PcsStockId,@ColId,@Sizeid,@StockQty,Case When IsNull(@Rework,0)=0 Then 'G' Else 'M' End,Case When IsNull(@Rework,0)=0 Then 0 Else @RejectionTypeId End)  

End  

End  

Else  

begin    

Select @PcsStockId=Max(IsNull(PcsStockId,0))+1 From Pcs_StockTable   

INSERT INTO Pcs_StockTable (Coycode,Ordid,styleNo,Stageid,PartId,SeqNo,GodId,PcsStockId,PartyId) VALUES (@Coycode,@Ordid,@StyleNo,@SourceStageid,@PartId,@SeqNo,@GodId,@PcsStockId,@PartyId)   

INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,GoodPcsFlag,RejectionTypeId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 'G' Else 'M' End,Case When (IsNull(@Rework,0)=0 OR  IsNull(@Rework,0)=2 )Then 0 Else @RejectionTypeId End)  


End    

End      





If @StageId<>1 And @FinalStage='F' And (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Piece' /* @SourceStageid<>0 And */    

Begin     

If EXISTS (select * from Pcs_StockTable INNER JOIN Trs_ProdEntry_SourceStageDtl ON  Pcs_StockTable.PartId

 = Trs_ProdEntry_SourceStageDtl.PartId And Pcs_StockTable.StageId  = Trs_ProdEntry_SourceStageDtl.SourceStageId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and GodId=@GodId and PartyId=@PartyId and LotId = @LotID And ISNULL(Pcs_StockTable.EmpID,0) = 0)    

begin      

Select @PcsStockId=PcsStockId From Pcs_StockTable INNER JOIN Trs_ProdEntry_SourceStageDtl ON  Pcs_StockTable.PartId = Trs_ProdEntry_SourceStageDtl.PartId And Pcs_StockTable.StageId  = Trs_ProdEntry_SourceStageDtl.SourceStageId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo  and GodId=@GodId and PartyId=@PartyId and LotId = @LotID And ISNULL(Pcs_StockTable.EmpID,0) = 0    

If EXISTS (select * from Pcs_StockTable Inner Join Pcs_StockTableQty On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId INNER JOIN Trs_ProdEntry_SourceStageDtl ON

  Pcs_StockTable.PartId = Trs_ProdEntry_SourceStageDtl.PartId And Pcs_StockTable.StageId  = Trs_ProdEntry_SourceStageDtl.SourceStageId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty
.SizeId=@SizeId and LOTID = @LOTID and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2)
 Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2)
 Then 0 Else @RejectionTypeId End And ISNULL(Pcs_StockTable.EmpID,0) = 0)    

Begin  

   if Rtrim(@LotwiseStockReqd) ='N' 

begin     

UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty+(@ProdPcs*IsNull(OrderQtyDtl.PcsPerColor,1)) From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_Prodentry On Pcs_StockTable.Coycode=Trs_Prodentry.CoyId And  Pcs_StockTable.OrdId=Trs_Prodentry.OrdId And Pcs_StockTable.StyleNo=Trs_Prodentry.StyleNo And Pcs_StockTable.GodId=Trs_Prodentry.GodId   INNER JOIN OrderQtyDtl on Pcs_StockTable.Ordid = OrderQtyDtl.Ordid And Pcs_StockTable.Styleno = OrderQtyDtl.StyleNo And OrderQtyDtl.ColId = Pcs_StockTableQty.Colid  And OrderQtyDtl.SizeId = Pcs_StockTableQty.SizeId And OrderQtyDtl.PartId = Pcs_StockTable.PartID And Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2)
Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2)
Then 0 Else @RejectionTypeId End   INNER JOIN Trs_ProdEntry_SourceStageDtl ON  Pcs_StockTable.PartId = Trs_ProdEntry_SourceStageDtl.PartId And Pcs_StockTable.StageId  = Trs_ProdEntry_SourceStageDtl.SourceStageId and Trs_ProdEntry_SourceStageDtl.id=@id WHERE Pcs_StockTable.coycode=Trs_Prodentry.CoyId And Pcs_StockTable.Ordid=Trs_Prodentry.Ordid and Pcs_StockTable.StyleNo=Trs_Prodentry.StyleNo and Pcs_StockTable.GodId=Trs_Prodentry.GodId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case  When (IsNull(@Rework,0)=0 OR   IsNull(@Rework,0)=2)
Then 'G' Else 'M' End and

 IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2)
Then 0 Else @RejectionTypeId End and Partyid=@Partyid  And Trs_Prodentry.Id=@Id  and OrderQtyDtl.CmbClrID = @ColID and Pcs_StockTable.LotID = @LotID  And ISNULL(Pcs_StockTable.EmpID,0) = 0

end  

else    

begin   

UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty+(@ProdPcs*IsNull(OrderQtyDtl.PcsPerColor,1)) From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_Prodentry On Pcs_StockTable.Coycode=Trs_Prodentry.CoyId And  Pcs_StockTable.OrdId=Trs_Prodentry.OrdId And Pcs_StockTable.StyleNo=Trs_Prodentry.StyleNo And Pcs_StockTable.GodId=Trs_Prodentry.GodId   INNER JOIN OrderQtyDtl on Pcs_StockTable.Ordid = OrderQtyDtl.Ordid And Pcs_StockTable.Styleno = OrderQtyDtl.StyleNo And OrderQtyDtl.ColId = Pcs_StockTableQty.Colid  And OrderQtyDtl.SizeId = Pcs_StockTableQty.SizeId And OrderQtyDtl.PartId = Pcs_StockTable.PartID and OrderQtyDtl.lotno=@LotNo And Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2)
Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2 )Then 0 Else @RejectionTypeId End   INNER JOIN Trs_ProdEntry_SourceStageDtl ON  Pcs_StockTable.PartId = Trs_ProdEntry_SourceStageDtl.PartId And Pcs_StockTable.StageId  = Trs_ProdEntry_SourceStageDtl.SourceStageId and Trs_ProdEntry_SourceStageDtl.id=@id WHERE Pcs_StockTable.coycode=Trs_Prodentry.CoyId And Pcs_StockTable.Ordid=Trs_Prodentry.Ordid and 

Pcs_StockTable.StyleNo=Trs_Prodentry.StyleNo and Pcs_StockTable.GodId=Trs_Prodentry.GodId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case  When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2
)Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.


RejectionTypeId,0)=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2)
 Then 0 Else @RejectionTypeId End and Partyid=@Partyid  And Trs_Prodentry.Id=@Id  and OrderQtyDtl.CmbClrID = @ColID and Pcs_StockTable.LotID = @LotID And ISNULL(Pcs_StockTable.EmpID,0) = 0  

end  

End  

Else    

Begin     

INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,GoodPcsFlag,RejectionTypeId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,Case When IsNull(@Rework,0)=0 Then 'G' Else  'M' End,Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2
)Then 0 Else @RejectionTypeId End) 
  

 End     

End    

Else     

begin       

Select @PcsStockId=Max(IsNull(PcsStockId,0))+1 From Pcs_StockTable   		



INSERT INTO Pcs_StockTable (Coycode,Ordid,styleNo,Stageid,PartId,SeqNo,GodId,PcsStockId,PartyId) VALUES (@Coycode,@Ordid,@StyleNo,@SourceStageid,@PartId,@SeqNo,@GodId,@PcsStockId,@PartyId) INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,GoodPcsFlag,RejectionTypeId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,Case When IsNull(@Rework,0)=0 Then 'G' Else 'M' End,Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 0 Else @RejectionTypeId End)  



End   



End    



FETCH NEXT FROM LINE_CURSOR INTO @id,@Sizeid,@ProdPcs   

END  

CLOSE 

LINE_CURSOR  

DEALLOCATE LINE_CURSOR  

SET NOCOUNT OFF   

End 

