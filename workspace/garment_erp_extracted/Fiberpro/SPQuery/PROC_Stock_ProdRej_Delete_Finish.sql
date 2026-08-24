/*;=============================================   
; Author           :  Global Software's    
; Create date      :  17/08/2022    
; Create By        :  ASLAM  
; Description      :  PANEL_Stock  
; Change Person    :  SWETHA
; Last Change Date :  21/02/2025 10.35 AM 
; =============================================  */  
 
CREATE PROCEDURE PROC_Stock_ProdRej_Delete_Finish (@Id Int) AS  DECLARE @Coycode Int,@Ordid Int,@StyleNo Varchar(20),@StageId Int,@PartId Int,@GodId Int,@ColId Int,@SizeId Int,@StockQty Int,@FinalStage Char(1),@SeqNo int,@PartyId Int,@PcsStockId Int,@RejectionTypeId Int ,@LotNo Varchar(15),@LotId Int,@Pcs Int,@stageid1 int   ,@PartID1 int,@Colid1 int,@Count int,@EntryOption int,@PcsPerColor int,@Prod_Without_Lot_Despatch_WithLot as char(1), @LotwiseStockReqd   char(1)  


Select @Id=@Id   
Select @Coycode = CoyId From Trs_PcsRej Where Id=@Id   
select @PartyId = 0   
SELECT @Ordid = OrdId From Trs_PcsRej Where Id=@Id   
SELECT @StyleNo = StyleNo From Trs_PcsRej Where Id=@Id   
SELECT @Stageid = isnull(Stk_StageId,stageid) From Trs_PcsRej Where Id=@Id   
SELECT @Stageid1 = StageId From Trs_PcsRej Where Id=@Id   
SELECT @PartId = PartId From Trs_PcsRej Where Id=@Id   SELECT @GodId = GodId From Trs_PcsRej Where Id=@Id  
 SELECT @LotNo = IsNull(LotNo,'') From Trs_PcsRej Where Id=@Id   
SELECT @RejectionTypeId = RejectionTypeId From Trs_PcsRej Where Id=@Id    
Select @SeqNo = SeqNo From Trs_PcsRej Inner Join Prod_Sequence On Trs_PcsRej.OrdId=Prod_Sequence.OrdId And Trs_PcsRej.StyleNo=Prod_Sequence.StyleNo And Trs_PcsRej.Stk_StageId=Prod_Sequence.StageId Where Id=@Id    
SELECT @FinalStage = Mas_Dept.SemiFinish From Trs_PcsRej Inner Join Mas_JobWrkComp On Trs_PcsRej.stk_StageId=Mas_JobWrkComp.Id Inner Join Mas_Dept On Mas_JobWrkComp.DeptId=Mas_Dept.DeptId Where Trs_PcsRej.Id=@Id    
SELECT @ColId = ClrId From Trs_PcsRej Where Id=@Id    
if ltrim(@LotNo)<>''  
SELECT @LotID = LotSno from mas_Lot where LotName =LTrim(@LotNo)  
else  
SELECT @LotId = 0   


SELECT @LotwiseStockReqd = isNull(LotwiseStockReqd,'Y') from Options   

SELECT @Prod_Without_Lot_Despatch_WithLot = isNull(Prod_Without_Lot_Despatch_WithLot,'Y') from Options1  

SELECT @EntryOption= EntryOption From OrderStyleDtl Where Ordid =@Ordid And StyleNo = @StyleNo 

BegiN  
 
DECLARE LINE_CURSOR CURSOR FOR           
Select Id,SizID,RejPcs FROM Trs_PcsRejQty Where ID=@Id    
OPEN LINE_CURSOR   
FETCH NEXT FROM LINE_CURSOR  INTO @id,@Sizeid,@Pcs    
WHILE @@FETCH_STATUS = 0    
BEGIN      
DECLARE @intCnt int 
SET @intCnt =1

IF @EntryOption =1 
BEGIN
  IF @LotwiseStockReqd ='Y'
   begin
DECLARE LINE_CURSOR_Part CURSOR FOR      
 Select PartId,ColID,PcsPerColor from OrderQtyDtl  WHeRE Ordid = @Ordid And Styleno = @Styleno And LotNo =@LotNo and SizeId = @SizeId
 And ColID = @ColId  Group by Partid,ColID,PcsPerColor
 OPEN LINE_CURSOR_Part   
 FETCH NEXT FROM LINE_CURSOR_Part  INTO @PartId1,@ColId1,@PcsPerColor
 
  END 

 ELSE

 BEGIN

 DECLARE LINE_CURSOR_Part CURSOR FOR      
  Select PartId,ColID,PcsPerColor from OrderQtyDtl  WHeRE Ordid = @Ordid And Styleno = @Styleno and SizeId = @SizeId
 And ColID = @ColId  Group by Partid,ColID,PcsPerColor
 OPEN LINE_CURSOR_Part   
 FETCH NEXT FROM LINE_CURSOR_Part  INTO @PartId1,@ColId1,@PcsPerColor

 END

end

ELSE
BEGIN
DECLARE LINE_CURSOR_Part CURSOR FOR           
 Select PartId,ColID,PcsPerColor from OrderQtyDtl  WHeRE Ordid = @Ordid And Styleno = @Styleno and SizeId = @SizeId  Group by Partid,ColID,PcsPerColor
 OPEN LINE_CURSOR_Part   
 FETCH NEXT FROM LINE_CURSOR_Part  INTO @PartId1,@ColId1,@PcsPerColor
END 



WHILE @@FETCH_STATUS = 0    
BEGIN   
UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty-(@Pcs * @PcsPerColor) From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_PcsRej On Pcs_StockTable.Coycode=Trs_PcsRej.CoyId And Pcs_StockTable.OrdId=Trs_PcsRej.OrdId And Pcs_StockTable.StyleNo=Trs_PcsRej.StyleNo And Pcs_StockTable.StageId=Trs_PcsRej.StageId And Pcs_StockTable.PartId=@PartId1 And Pcs_StockTable.GodId=Trs_PcsRej.GodId And Pcs_StockTableQty.ColId=@ColId1 and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='M' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=@RejectionTypeId And Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='M' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=@RejectionTypeId WHERE Pcs_StockTable.coycode=Trs_PcsRej.CoyId And Pcs_StockTable.Ordid=Trs_PcsRej.Ordid and Pcs_StockTable.StyleNo=Trs_PcsRej.StyleNo and Pcs_StockTable.Stageid=Trs_PcsRej.stageid And Pcs_StockTable.PartId=@PartId1 and Pcs_StockTable.GodId=Trs_PcsRej.GodId and Pcs_StockTableQty.Colid=@ColId1 and Pcs_StockTableQty.SizeId=@SizeId and Pcs_StockTable.LotID = @LotId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='M' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=@RejectionTypeId and Partyid=@Partyid And Trs_PcsRej.Id=@Id  And ISNULL(Pcs_StockTable.EmpID,0)  = 0
BegiN  

If EXISTS (select * from Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo And LotID = @LotID and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId And ISNULL(Pcs_StockTable.EmpID,0)  = 0)  
begiN  
Select @PcsStockId=PcsStockId From Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotID = @LotID and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId  And ISNULL(Pcs_StockTable.EmpID,0)  = 0
if @intCnt =1
BEGIN
If EXISTS (select * from Pcs_StockTable Inner Join Pcs_StockTableQty On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where Coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotID = @LotID  and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0 And ISNULL(Pcs_StockTable.EmpID,0)  = 0)  
BegiN   


UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty+@Pcs,ProductionQty=Pcs_StockTableQty.ProductionQty+@Pcs From Pcs_StockTableQty Inner Join
 Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_PcsRej On Pcs_StockTable.Coycode=Trs_PcsRej.CoyId And Pcs_StockTable.OrdId=Trs_PcsRej.OrdId And Pcs_StockTable.StyleNo=Trs_PcsRej.StyleNo And Pcs_StockTable.PartId=Trs_PcsRej.PartId And Pcs_StockTable.GodId=Trs_PcsRej.GodId And Pcs_StockTableQty.ColId=Trs_PcsRej.ClrId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0 And Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0 WHERE Pcs_StockTable.coycode=Trs_PcsRej.CoyId And Pcs_StockTable.Ordid=Trs_PcsRej.Ordid and Pcs_StockTable.StyleNo=Trs_PcsRej.StyleNo And Pcs_StockTable.PartId=Trs_PcsRej
.PartId and Pcs_StockTable.GodId=Trs_PcsRej.GodId and Pcs_StockTableQty.Colid=Trs_PcsRej.ClrId and Pcs_StockTableQty.SizeId=@SizeId and Pcs_StockTable.LotID = @LotId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0 and Partyid=@Partyid And Pcs_StockTable.StageId=@StageId And Trs_PcsRej.Id=@Id And ISNULL(Pcs_StockTable.EmpID,0)  = 0 

End  
Else  
Begin  
INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,GoodPcsFlag,RejectionTypeId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,'G',0) End  

END
End  
Else  
begin  
Select @PcsStockId=Max(IsNull(PcsStockId,0))+1 From Pcs_StockTable  
INSERT INTO Pcs_StockTable (Coycode,Ordid,styleNo,Stageid,PartId,SeqNo,GodId,PcsStockId,PartyId,LotID) VALUES (@Coycode,@Ordid,@StyleNo,@Stageid,@PartId,@SeqNo,@GodId,@PcsStockId,@PartyId,@LotId)  
INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,GoodPcsFlag,RejectionTypeId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,'G',0) 
End  
EnD 
FETCH NEXT FROM LINE_CURSOR_Part  INTO @PartId1,@ColId1,@PcsPerColor
SET @intCnt = @intCnt +1
END


CLOSE LINE_CURSOR_PART   
DEALLOCATE LINE_CURSOR_PART    
SET NOCOUNT OFF  
   
FETCH NEXT FROM LINE_CURSOR INTO @id,@Sizeid,@Pcs    
END
END    
CLOSE LINE_CURSOR   
DEALLOCATE LINE_CURSOR    
SET NOCOUNT OFF  
 
