/*;=============================================   
; Author           :  Global Software's    
; Create date      :  18/02/2026    
; Create By        :  ASLAM  
; Description      :  REJECTION DELETE
; Change Person    :  ASLAM
; Last Change Date :  18/02/2026 10.00 AM 
; =============================================  */    
CREATE PROCEDURE PROC_Stock_ProdRej_Delete_Line (@Id Int) AS  DECLARE @Coycode Int,@Ordid Int,@StyleNo Varchar(20),@StageId Int,@PartId Int,@GodId Int,@ColId Int,@SizeId Int,@StockQty Int,@FinalStage Char(1),@SeqNo int,@PartyId Int,@PcsStockId Int,@RejectionTypeId Int ,@LotNo Varchar(15),@LotId Int,@Pcs Int,@stageid1 int  ,@LineID int
SELECT @Id=@Id   
Select @Coycode = CoyId From Trs_PcsRej Where Id=@Id   
select @PartyId = 0   
SELECT @Ordid = OrdId From Trs_PcsRej Where Id=@Id   
SELECT @StyleNo = StyleNo From Trs_PcsRej Where Id=@Id   
SELECT @Stageid = isnull(Stk_StageId,stageid) From Trs_PcsRej Where Id=@Id   
SELECT @Stageid1 = StageId From Trs_PcsRej Where Id=@Id   
SELECT @PartId = PartId From Trs_PcsRej Where Id=@Id   
SELECT @GodId = GodId From Trs_PcsRej Where Id=@Id  
SELECT @LineID = ISNULL(LineId,0) From Trs_PcsRej Where Id=@Id  
SELECT @LotNo = IsNull(LotNo,'') From Trs_PcsRej Where Id=@Id   
SELECT @RejectionTypeId = RejectionTypeId From Trs_PcsRej Where Id=@Id    
Select @SeqNo = SeqNo From Trs_PcsRej Inner Join Prod_Sequence On Trs_PcsRej.OrdId=Prod_Sequence.OrdId And Trs_PcsRej.StyleNo=Prod_Sequence.StyleNo And Trs_PcsRej.Stk_StageId=Prod_Sequence.StageId Where Id=@Id    
SELECT @FinalStage = Mas_Dept.SemiFinish From Trs_PcsRej Inner Join Mas_JobWrkComp On Trs_PcsRej.stk_StageId=Mas_JobWrkComp.Id Inner Join Mas_Dept On Mas_JobWrkComp.DeptId=Mas_Dept.DeptId Where Trs_PcsRej.Id=@Id    
SELECT @ColId = ClrId From Trs_PcsRej Where Id=@Id    
if ltrim(@LotNo)<>''  
	SELECT @LotID = LotSno from mas_Lot where LotName =LTrim(@LotNo)  
else  
	SELECT @LotId = 0   
	Begin   
	
	DECLARE LINE_CURSOR CURSOR FOR           
	Select Id,SizID,RejPcs FROM Trs_PcsRejQty Where ID=@Id    
	OPEN LINE_CURSOR   
	FETCH NEXT FROM LINE_CURSOR  INTO @id,@Sizeid,@Pcs    
	WHILE @@FETCH_STATUS = 0    
	BEGIN      
	print 'as1'
	UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty-@Pcs From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_PcsRej On Pcs_StockTable.Coycode=Trs_PcsRej.CoyId And Pcs_StockTable.OrdId=Trs_PcsRej.OrdId And Pcs_StockTable.StyleNo=Trs_PcsRej.StyleNo And Pcs_StockTable.StageId=Trs_PcsRej.StageId And Pcs_StockTable.PartId=Trs_PcsRej.PartId And Pcs_StockTable.GodId=Trs_PcsRej.GodId And Pcs_StockTableQty.ColId=Trs_PcsRej.ClrId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='M' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=@RejectionTypeId And Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='M' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=@RejectionTypeId WHERE Pcs_StockTable.coycode=Trs_PcsRej.CoyId And Pcs_StockTable.Ordid=Trs_PcsRej.Ordid and Pcs_StockTable.StyleNo=Trs_PcsRej.StyleNo and Pcs_StockTable.Stageid=Trs_PcsRej.stageid And Pcs_StockTable.PartId=Trs_PcsRej.PartId and Pcs_StockTable.GodId=Trs_PcsRej.GodId and Pcs_StockTableQty.Colid=Trs_PcsRej.ClrId and Pcs_StockTableQty.SizeId=@SizeId and Pcs_StockTable.LotID = @LotId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='M' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=@RejectionTypeId and Partyid=@Partyid And Trs_PcsRej.Id=@Id And ISNULL(Pcs_StockTable.EmpID,0)= 0  
	
	Begin  
	print 'as2'
	If EXISTS (select * from Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo And LotID = @LotID and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId And ISNULL(Pcs_StockTable.EmpID,0)= @Lineid)
	  begin  
	  print 'as3'
		Select @PcsStockId=PcsStockId From Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotID = @LotID and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId  And ISNULL(Pcs_StockTable.EmpID,0)= @Lineid

		If EXISTS (select * from Pcs_StockTable Inner Join Pcs_StockTableQty On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where Coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotID = @LotID  and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0 And ISNULL(Pcs_StockTable.EmpID,0)= @Lineid)  
			Begin   
			print 'as4'
				UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty+@Pcs,ProductionQty=Pcs_StockTableQty.ProductionQty+@Pcs From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_PcsRej On Pcs_StockTable.Coycode=Trs_PcsRej.CoyId And Pcs_StockTable.OrdId=Trs_PcsRej.OrdId And Pcs_StockTable.StyleNo=Trs_PcsRej.StyleNo And Pcs_StockTable.PartId=Trs_PcsRej.PartId And Pcs_StockTable.GodId=Trs_PcsRej.GodId And Pcs_StockTableQty.ColId=Trs_PcsRej.ClrId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0 And Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0 WHERE Pcs_StockTable.coycode=Trs_PcsRej.CoyId And Pcs_StockTable.Ordid=Trs_PcsRej.Ordid and Pcs_StockTable.StyleNo=Trs_PcsRej.StyleNo And Pcs_StockTable.PartId=Trs_PcsRej.PartId and Pcs_StockTable.GodId=Trs_PcsRej.GodId and Pcs_StockTableQty.Colid=Trs_PcsRej.ClrId and Pcs_StockTableQty.SizeId=@SizeId and Pcs_StockTable.LotID = @LotId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0 and Partyid=@Partyid And Pcs_StockTable.StageId=@StageId And Trs_PcsRej.Id=@Id And ISNULL(Pcs_StockTable.EmpID,0)= @Lineid  
			End  
			Else  
				Begin 
				print 'as5' 
					INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,GoodPcsFlag,RejectionTypeId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,'G',0) 
				End  
		End  
		Else  
			begin  
				Select @PcsStockId=Max(IsNull(PcsStockId,0))+1 From Pcs_StockTable  
				print 'as6'
				INSERT INTO Pcs_StockTable (Coycode,Ordid,styleNo,Stageid,PartId,SeqNo,GodId,PcsStockId,PartyId,LotID) VALUES (@Coycode,@Ordid,@StyleNo,@Stageid,@PartId,@SeqNo,@GodId,@PcsStockId,@PartyId,@LotId)  
				INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,GoodPcsFlag,RejectionTypeId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,'G',0) 
			End  
		End    
		FETCH NEXT FROM LINE_CURSOR INTO @id,@Sizeid,@Pcs    
	END    
	CLOSE LINE_CURSOR   
	DEALLOCATE LINE_CURSOR    
	SET NOCOUNT OFF  
	End 