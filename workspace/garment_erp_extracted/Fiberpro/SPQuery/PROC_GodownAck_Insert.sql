/*;=============================================   
; Author           :  Global Software's    
; Create date      :  04/02/2026    
; Create By        :  ASLAM  
; Description      :  GODOWN ACK
; Change Person    :  KALAI
; Last Change Date :  04/02/2026 10.00 AM 
; =============================================  */  
CREATE PROCEDURE PROC_GodownAck_Insert
(@Id Int,@StyleNo Varchar(20),@PartID Int,@colId Int,@SizeId Int,@Pcs Int,@LotNo Varchar(15))  AS  
DECLARE @Coycode Int, @Partyid Int,@OrdId Int,@StageId Int,@GodId Int,@StockQty Int,@PcsStockId Int,@SeqNo int ,@LotId
 Int  ,@RejectionTypeId Int,@ProcessType Char(1),@GoodFlg Char(1) ,@SrcLineID Int   
Select @Id = @Id  
Select @Coycode = Coycode From Trs_PcsGodAck1 Where Id=@Id   
select @PartyId = 0   SELECT @Ordid = Ordjobno From Trs_Pcs1 Inner Join Trs_PcsGodAck2 On Trs_Pcs1.Id=Trs_PcsGodAck2.TransId Where Trs_PcsGodAck2.Id=@Id   
SELECT @StyleNo = @StyleNo   
Select @SrcLineID =Isnull(SrcLineID,0) From Trs_Pcs1 Inner Join 
Trs_PcsGodAck2 On Trs_Pcs1.Id=Trs_PcsGodAck2.
TransId Inner Join Trs_Pcs2 On Trs_Pcs1.ID=Trs_Pcs2.ID  And Trs_Pcs2.ColID=Trs_PcsGodAck2.ColId And Trs_Pcs2.SizeID=Trs_PcsGodAck2.SizeId
And Trs_Pcs2.StyleNo=Trs_PcsGodAck2.StyleNo And  Trs_Pcs2.PartID=Trs_PcsGodAck2.PartID And Trs_Pcs2.LotNo=Trs_PcsGodAck2.LotNo 
Where Trs_PcsGodAck2.ID=@Id
SELECT @StageId = TargetStageID From Trs_Pcs1 Inner Join Trs_PcsGodAck2 On Trs_Pcs1.Id=Trs_PcsGodAck2.TransId Where Trs_PcsGodAck2.Id=@Id   
SELECT @ColId = @ColId   SELECT @SizeId = @SizeId   
SELECT @StockQty = @Pcs   SELECT @PartId = @PartId   SELECT @GodId = GodId From Trs_PcsGodAck1 Where Id=@Id   
Select @SeqNo = SeqNo From Prod_Sequence Where Prod_Sequence.OrdId=@OrdId And Prod_Sequence.StyleNo=@StyleNo And 
Prod_Sequence.StageId=@StageId 
SELECT @ProcessType = ProcessType From Trs_Pcs1 Inner Join Trs_PcsGodAck2 On Trs_Pcs1.Id=Trs_PcsGodAck2.TransId Where 
Trs_PcsGodAck2.Id=@Id    SELECT @ProcessType =Ltrim(@ProcessType) SELECT @RejectionTypeId = RejectionTypeId from trs_pcs1 where id=@id   
if @ProcessType='P' SELECT @GoodFlg ='G' Else	 	SELECT @GoodFlg ='M'  
if ltrim(@LotNo)<>''  SELECT @LotID = LotSno from mas_Lot where LotName =LTrim(@LotNo)  ELSE  
SELECT @LotId = 0   
 If @SrcLineID=0 BEGIN
Begin   If EXISTS (
select * from Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotID and Stageid=@Stageid 
and PartId=@PartId and GodId=@GodId and PartyId=@PartyId)   begin   
Select @PcsStockId=PcsStockId From Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotID and 
Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId   
If EXISTS (select * from Pcs_StockTable Inner Join Pcs_StockTableQty On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId 
where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and Stageid=@Stageid and LotId = @LotID and PartId=@PartId and 
GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId)   
Begin   Update Pcs_StockTableQty Set
 Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty+@StockQty From Pcs_StockTableQty Inner Join Pcs_StockTable 
 On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and 
 LotId = @LotID and
 Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.ColId=@Colid and 
 Pcs_StockTableQty.SizeId=@SizeId And GoodPcsFlag='G'   End    Else    Begin     
 INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,GoodPcsFlag,RejectionTypeId) VALUES 
 (@PcsStockId,@ColId,@Sizeid,@StockQty,@GoodFlg,Case When @ProcessType='P' Then 0 Else @RejectionTypeId End)   End  End  Else   
 begin   Select @PcsStockId=Max(IsNull(PcsStockId,0))+1 From Pcs_StockTable   INSERT INTO 
Pcs_StockTable (Coycode,Ordid,styleNo,Stageid,PartId,SeqNo,GodId,PcsStockId,PartyId,LotID) VALUES (@Coycode,@Ordid,@StyleNo,@Stageid,
@PartId,@SeqNo,@GodId,@PcsStockId,@PartyId,@LotID)   INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,GoodPcsFlag,
RejectionTypeId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,@GoodFlg,Case When @ProcessType='P' Then 0 Else @RejectionTypeId End)   
 END END END
Else BEGIN
Begin   If EXISTS (
select * from Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotID and Stageid=@Stageid 
and PartId=@PartId and GodId=@GodId and PartyId=@PartyId And EmpId=@SrcLineID)   begin   
Select @PcsStockId=PcsStockId From Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotID and 
Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId And EmpID=@SrcLineID  
If EXISTS (select * from Pcs_StockTable Inner Join Pcs_StockTableQty On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId 
where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and Stageid=@Stageid and LotId = @LotID and PartId=@PartId and 
GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId And EmpID=@SrcLineID)   
Begin   Update Pcs_StockTableQty Set
 Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty+@StockQty From Pcs_StockTableQty Inner Join Pcs_StockTable 
 On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and 
 LotId = @LotID and
 Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.ColId=@Colid and 
 Pcs_StockTableQty.SizeId=@SizeId And GoodPcsFlag='G' And EmpID=@SrcLineID  End    Else    Begin     
 INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,GoodPcsFlag,RejectionTypeId) VALUES 
 (@PcsStockId,@ColId,@Sizeid,@StockQty,@GoodFlg,Case When @ProcessType='P' Then 0 Else @RejectionTypeId End)   End  End  Else   
 begin   Select @PcsStockId=Max(IsNull(PcsStockId,0))+1 From Pcs_StockTable   INSERT INTO 
Pcs_StockTable (Coycode,Ordid,styleNo,Stageid,PartId,SeqNo,GodId,PcsStockId,PartyId,LotID,EmpID) VALUES (@Coycode,@Ordid,@StyleNo,@Stageid,
@PartId,@SeqNo,@GodId,@PcsStockId,@PartyId,@LotID,@SrcLineID)   INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,GoodPcsFlag,
RejectionTypeId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,@GoodFlg,Case When @ProcessType='P' Then 0 Else @RejectionTypeId End) 
END  END END