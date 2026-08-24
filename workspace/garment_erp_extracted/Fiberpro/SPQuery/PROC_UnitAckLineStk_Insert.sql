/*;=============================================   
; Author           :  Global Software's    
; Create date      :  21/01/2026    
; Create By        :  KALAI  
; Description      :  UNIT ACK
; Change Person    :  KALAI
; Last Change Date :  21/01/2026 10.00 AM 
; =============================================  */  
CREATE PROCEDURE PROC_UnitAckLineStk_Insert (@Id Int,@StyleNo Varchar(20),@PartID Int,@ColId Int,@SizeId Int,@Pcs Int,@LotNo Varchar(15) ,
@TransID Int,@EmpID int) AS  DECLARE @Coycode Int, @Partyid Int,@OrdId Int,@StageId Int,@GodId Int,@StockQty Int,@PcsStockId Int,@SeqNo int ,
@ProcessType Char(1),@RejectionTypeId int ,@LotId Int     
SELECT @Coycode = Coycode From Trs_UnitAck1 Where Id=@Id    
SELECT @PartyId = 0    
SELECT @Ordid = Ordjobno From Trs_Pcs1 Inner Join Trs_UnitAck2 On Trs_Pcs1.Id=Trs_UnitAck2.TransId Where 
Trs_UnitAck2.Id=@Id    and transid = @TransID and StyleNo=@StyleNo 
SELECT @StageId = TargetStageID From Trs_Pcs1 Inner Join Trs_UnitAck2 On Trs_Pcs1.Id=Trs_UnitAck2.TransId Where Trs_UnitAck2.Id=@Id  
and transid = @TransID and StyleNo=@StyleNo   
SELECT @StockQty = @Pcs  
SELECT @GodId = GodId From Trs_UnitAck1 Where Id=@Id   
Select @SeqNo = SeqNo From Prod_Sequence Where Prod_Sequence.OrdId=@OrdId And Prod_Sequence.StyleNo=@StyleNo And Prod_Sequence.StageId=
@StageId    SELECT @RejectionTypeId = RejectionTypeId from trs_pcs1 where id=@id   
SELECT @ProcessType = ProcessType From Trs_Pcs1 Inner Join Trs_UnitAck2 On Trs_Pcs1.Id=Trs_UnitAck2.TransId Where Trs_UnitAck2.Id=@Id 
and transid = @TransID and StyleNo=@StyleNo  if ltrim(@LotNo)<>''  
SELECT @LotID = LotSno from mas_Lot where LotName =LTrim(@LotNo)  ELSE  SELECT @LotId = 0   
SELECT  @EmpId=@EmpID
Begin   
If EXISTS (select * from Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and LotID = @LotID and StyleNo=@StyleNo and Stageid=
@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId And EmpID=@EmpId)   
begin   
Select @PcsStockId=PcsStockId From Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and LotID = @LotID and StyleNo=@StyleNo and 
Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId  And EmpID=@EmpId 
If EXISTS (select * from Pcs_StockTable Inner Join Pcs_StockTableQty On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where 
coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotID = @LotID and Stageid=@Stageid and PartId=@PartId and GodId=@GodId 
and PartyId=@PartyId and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and GoodPcsFlag ='G' And EmpID=@EmpId)  
Begin   
Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty+@StockQty From Pcs_StockTableQty Inner Join 
Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo 
and LotID = @LotID and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.ColId=
@Colid and Pcs_StockTableQty.SizeId=@SizeId   and GoodPcsFlag ='G' And EmpID=@EmpId
End   Else     
Begin    
INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,GoodPcsFlag,RejectionTypeId) VALUES (@PcsStockId,@ColId,@Sizeid,
@StockQty,Case When @ProcessType='P' Then 'G' Else 'M' End,Case When @ProcessType='P' Then 0 Else @RejectionTypeId End)    End  End  
Else    begin    Select @PcsStockId=Max(IsNull(PcsStockId,0))+1 From Pcs_StockTable   
INSERT INTO Pcs_StockTable (Coycode,Ordid,styleNo,Stageid,PartId,SeqNo,GodId,PcsStockId,PartyId,LotID,EmpID) VALUES 
(@Coycode,@Ordid,@StyleNo,@Stageid,@PartId,@SeqNo,@GodId,@PcsStockId,@PartyId,@LotID,@EmpId)   
INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,GoodPcsFlag,RejectionTypeId) VALUES (@PcsStockId,@ColId,@Sizeid,
@StockQty,Case When @ProcessType='P' Then 'G' Else 'M' End,Case When @ProcessType='P' Then 0 Else @RejectionTypeId End)   End   End 