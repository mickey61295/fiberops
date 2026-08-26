/*;=============================================   
; Author           :  Global Software's    
; Create date      :  21/01/2026    
; Create By        :  KALAI  
; Description      :  UNIT ACK
; Change Person    :  KALAI
; Last Change Date :  21/01/2026 10.05 AM 
; =============================================  */  
CREATE PROCEDURE PROC_Stock_ProdRej_Insert_Line (@Id Int,@Styleno Varchar(20),@PartID Int,@ColId Int,@SizeId Int,@Pcs Int,@LotNo Varchar(15)) AS   
DECLARE @Coycode Int,@Ordid Int,@StageId Int,@GodId Int,@StockQty Int,@FinalStage Char(1),@SeqNo int,@PartyId Int,@PcsStockId Int,@RejectionTypeId Int,@LotId Int   ,@StageID1 int  ,
@LineId Int 

Select @Coycode = CoyId From Trs_PcsRej Where Id=@Id  
select @PartyId = 0   
SELECT @Ordid = OrdId From Trs_PcsRej Where Id=@Id  
SELECT @StyleNo = StyleNo From Trs_PcsRej Where Id=@Id  
SELECT @Stageid = isNull(Stk_StageId,StageId) From Trs_PcsRej Where Id=@Id  
SELECT @Stageid1 = StageId From Trs_PcsRej Where Id=@Id  
SELECT @PartId = PartId From Trs_PcsRej Where Id=@Id  
SELECT @GodId = GodId From Trs_PcsRej Where Id=@Id  
SELECT @RejectionTypeId = RejectionTypeId From Trs_PcsRej Where Id=@Id  
SELECT @LineId = isNull(LineID,0) From Trs_PcsRej Where Id=@Id  

Select @SeqNo = SeqNo From Trs_PcsRej Inner Join Prod_Sequence On Trs_PcsRej.OrdId=Prod_Sequence.OrdId And Trs_PcsRej.StyleNo=Prod_Sequence.StyleNo And Trs_PcsRej.StageId=Prod_Sequence.StageId Where Id=@Id  

SELECT @FinalStage = Mas_Dept.SemiFinish From Trs_PcsRej Inner Join Mas_JobWrkComp On Trs_PcsRej.Stk_StageId=Mas_JobWrkComp.Id Inner Join Mas_Dept On Mas_JobWrkComp.DeptId=Mas_Dept.DeptId Where Trs_PcsRej.Id=@Id  

SELECT @ColId = ClrId From Trs_PcsRej Where Id=@Id  
SELECT @StockQty = @Pcs 

if ltrim(@LotNo)<>''  
SELECT @LotID = LotSno from Mas_Lot Where LotName =LTrim(@LotNo)  
	ELSE  
SELECT @LotId = 0   

Begin  
If EXISTS (Select * from Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotID = @LotID and Stageid=@Stageid1 and PartId=@PartId and GodId=@GodId and PartyId=@PartyId And ISNULL(Pcs_StockTable.EmpID,0) = 0)  
	BEGIN  
		Select @PcsStockId=PcsStockId From Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotID = @LotID and Stageid=@Stageid1 and PartId=@PartId and GodId=@GodId and PartyId=@PartyId  And ISNULL(Pcs_StockTable.EmpID,0) = 0

		If EXISTS (select * from Pcs_StockTable Inner Join Pcs_StockTableQty On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotID = @LotID and Stageid=@Stageid1 and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='M' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=@RejectionTypeId And ISNULL(Pcs_StockTable.EmpID,0) = 0 )   
		Begin  
			Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty+@StockQty From 
Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotID = @LotID and Stageid=@Stageid1 and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='M' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=@RejectionTypeId  And ISNULL(Pcs_StockTable.EmpID,0) = 0 
		End  
		Else  
		Begin  
			INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,GoodPcsFlag,RejectionTypeId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,'M',@RejectionTypeId) 
		End 
	EnD 
Else 
	begin 
		Select @PcsStockId=Max(IsNull(PcsStockId,0))+1 From Pcs_StockTable  
			INSERT INTO Pcs_StockTable (Coycode,Ordid,styleNo,Stageid,PartId,SeqNo,GodId,PcsStockId,PartyId,LotID) VALUES (@Coycode,@Ordid,@StyleNo,@Stageid1,@PartId,@SeqNo,@GodId,@PcsStockId,@PartyId,@LotId) 

			INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,GoodPcsFlag,RejectionTypeId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,'M',@RejectionTypeId) 
	End  
	Select @PcsStockId=PcsStockId From Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotID = @LotID and Stageid=@StageId and PartId=@PartId and GodId=@GodId and PartyId=@PartyId And ISNULL(Pcs_StockTable.EmpID,0) = @LineId   
	
	Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-@StockQty,Pcs_StockTableQty.ProductionQty=Pcs_StockTableQty.ProductionQty-@StockQty
 From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotID = @LotID and Stageid=@StageId and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0 And ISNULL(Pcs_StockTable.EmpID,0) = @LineId 
 
 End 